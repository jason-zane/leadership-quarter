import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { CampaignSubmitSchema } from '@/utils/assessments/submission-schema'
import {
  sanitizeDemographicsRecord,
  type CampaignDemographics,
} from '@/utils/assessments/campaign-types'
import { getPublicBaseUrl } from '@/utils/hosts'
import {
  createGateAccessToken,
  createReportAccessToken,
  hasGateAccessTokenSecret,
  hasReportAccessTokenSecret,
} from '@/utils/security/report-access'
import {
  gateTokenTtlSeconds,
  invitationExpiryMs,
  reportAccessTtlSeconds,
  warmPlatformSettings,
} from '@/utils/services/platform-settings-runtime'
import { loadPublicCampaignRuntimeContext } from '@/utils/services/assessment-campaign-context'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>
import { upsertContactByEmail } from '@/utils/services/contacts'
import { ensureAssessmentParticipant } from '@/utils/services/assessment-participants'

type RegisterPayload = {
  firstName?: string
  lastName?: string
  email?: string
  organisation?: string
  role?: string
  demographics?: CampaignDemographics
}

type CampaignInvitationLink = {
  assessmentId: string
  token: string
  surveyPath: string
}

type CampaignEntryFailure = {
  ok: false
  error:
    | 'missing_service_role'
    | 'invalid_payload'
    | 'invalid_fields'
    | 'campaign_not_found'
    | 'campaign_not_active'
    | 'campaign_limit_reached'
    | 'survey_not_active'
    | 'assessment_not_active'
    | 'invitation_create_failed'
    | 'missing_gate_secret'
    | 'missing_report_secret'
    | 'assessment_selector_required'
    | 'assessment_not_found'
    | 'questions_load_failed'
    | 'invalid_responses'
    | 'submission_failed'
    | 'classification_failed'
  message?: string
  assessmentId?: string
}

export type RegisterAssessmentCampaignResult =
  | {
      ok: true
      data: {
        token: string
        surveyPath: string
        invitations: CampaignInvitationLink[]
      }
    }
  | CampaignEntryFailure

export type SubmitAssessmentCampaignResult =
  | ({
      ok: true
      data:
        | {
            nextStep: 'complete_no_report'
          }
        | {
            nextStep: 'contact_gate'
            gatePath: string
          }
        | {
            submissionId: string
            reportPath: string
            reportAccessToken: string
          }
    } & { assessmentId?: string })
  | CampaignEntryFailure

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parseParticipant(input: {
  firstName?: string
  lastName?: string
  email?: string
  organisation?: string
  role?: string
} | null | undefined) {
  const firstName = String(input?.firstName ?? '').trim()
  const lastName = String(input?.lastName ?? '').trim()
  const email = String(input?.email ?? '').trim().toLowerCase()
  const organisation = String(input?.organisation ?? '').trim()
  const role = String(input?.role ?? '').trim()

  if (!firstName || !lastName || !isValidEmail(email)) {
    return { ok: false as const }
  }

  return {
    ok: true as const,
    data: {
      firstName,
      lastName,
      email,
      organisation,
      role,
    },
  }
}

function getCampaignDemographics(fields: unknown, enabled: boolean, input: unknown) {
  if (!enabled) return null
  return sanitizeDemographicsRecord(fields, input)
}

function isCampaignLimitReachedError(error: { message?: string | null; details?: string | null } | null | undefined) {
  const message = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase()
  return message.includes('campaign_limit_reached')
}

async function findExistingCampaignInvitation(
  adminClient: AdminClient,
  campaignId: string,
  assessmentId: string,
  email: string
): Promise<{ id: string; assessment_id: string; token: string; started_at: string | null } | null> {
  const now = new Date().toISOString()
  const { data } = await adminClient
    .from('assessment_invitations')
    .select('id, assessment_id, token, started_at')
    .eq('campaign_id', campaignId)
    .eq('assessment_id', assessmentId)
    .eq('email', email)
    .in('status', ['pending', 'sent', 'opened', 'started'])
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export async function registerAssessmentCampaignParticipant(input: {
  organisationSlug: string
  campaignSlug: string
  payload: RegisterPayload | null
}): Promise<RegisterAssessmentCampaignResult> {
  if (!input.payload) {
    return { ok: false, error: 'invalid_payload' }
  }

  const participant = parseParticipant(input.payload)
  if (!participant.ok) {
    return { ok: false, error: 'invalid_fields' }
  }

  const context = await loadPublicCampaignRuntimeContext({
    organisationSlug: input.organisationSlug,
    campaignSlug: input.campaignSlug,
  })
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  const assessmentRows = (context.campaign.campaign_assessments ?? [])
    .filter((row) => row.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
  const activeAssessments = assessmentRows
    .map((row) => (Array.isArray(row.assessments) ? row.assessments[0] ?? null : row.assessments ?? null))
    .filter((assessment): assessment is NonNullable<typeof assessment> => Boolean(assessment))
    .filter((assessment) => assessment.status === 'active')

  if (activeAssessments.length === 0) {
    return { ok: false, error: 'survey_not_active' }
  }

  const primaryAssessment = activeAssessments[0]

  await warmPlatformSettings(context.adminClient)

  const demographics = getCampaignDemographics(
    context.campaign.config.demographics_fields,
    context.campaign.config.demographics_enabled,
    input.payload.demographics
  )

  const contactResult = await upsertContactByEmail(context.adminClient, {
    firstName: participant.data.firstName,
    lastName: participant.data.lastName,
    email: participant.data.email,
    source: `campaign:${input.organisationSlug}/${input.campaignSlug}`,
  })
  const contactId = contactResult.data?.id ?? null
  const participantRecord = await ensureAssessmentParticipant({
    client: context.adminClient,
    contactId,
    email: participant.data.email,
    firstName: participant.data.firstName,
    lastName: participant.data.lastName,
    organisation: participant.data.organisation || null,
    role: participant.data.role || null,
  })
  const participantId = participantRecord.data?.id ?? null

  // Idempotency: return the existing invitation token if this email already
  // registered for this campaign and the invitation hasn't expired.
  const expiresAt = new Date(Date.now() + invitationExpiryMs()).toISOString()
  const invitations: Array<{ id: string; assessmentId: string; token: string }> = []

  for (const assessment of activeAssessments) {
    const existingInvitation = await findExistingCampaignInvitation(
      context.adminClient,
      context.campaign.id,
      assessment.id,
      participant.data.email
    )

    if (existingInvitation) {
      invitations.push({
        id: existingInvitation.id,
        assessmentId: assessment.id,
        token: existingInvitation.token,
      })
      continue
    }

    const { data: invitationRow, error: invitationError } = await context.adminClient
      .from('assessment_invitations')
      .insert({
        assessment_id: assessment.id,
        campaign_id: context.campaign.id,
        participant_id: participantId,
        contact_id: contactId,
        email: participant.data.email,
        first_name: participant.data.firstName,
        last_name: participant.data.lastName,
        organisation: participant.data.organisation || null,
        role: participant.data.role || null,
        demographics,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, token')
      .single()

    if (invitationError || !invitationRow) {
      if (isCampaignLimitReachedError(invitationError)) {
        return { ok: false, error: 'campaign_limit_reached' }
      }
      console.error('[campaign-register] invitation create failed', {
        campaignId: context.campaign.id,
        assessmentId: assessment.id,
        message: invitationError?.message ?? null,
        details: invitationError?.details ?? null,
        code: 'code' in (invitationError ?? {}) ? (invitationError as { code?: string | null }).code ?? null : null,
      })
      return { ok: false, error: 'invitation_create_failed' }
    }

    invitations.push({
      id: invitationRow.id,
      assessmentId: assessment.id,
      token: invitationRow.token,
    })
  }

  const primaryInvitation = invitations.find((invitation) => invitation.assessmentId === primaryAssessment.id) ?? invitations[0]
  if (!primaryInvitation) {
    return { ok: false, error: 'invitation_create_failed' }
  }

  if (context.campaign.config.registration_position === 'before') {
    const invitationUrl = `${getPublicBaseUrl()}/assess/i/${primaryInvitation.token}`
    const emailResult = await sendSurveyInvitationEmail({
      to: participant.data.email,
      firstName: participant.data.firstName,
      surveyName: primaryAssessment.name,
      invitationUrl,
      campaignId: context.campaign.id,
    })

    if (emailResult.ok) {
      await context.adminClient
        .from('assessment_invitations')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', primaryInvitation.id)
    } else {
      console.error('[campaign-register] invitation email failed:', emailResult.error)
    }
  }

  return {
    ok: true,
    data: {
      token: primaryInvitation.token,
      surveyPath: `/assess/i/${primaryInvitation.token}`,
      invitations: invitations.map((invitation) => ({
        assessmentId: invitation.assessmentId,
        token: invitation.token,
        surveyPath: `/assess/i/${invitation.token}`,
      })),
    },
  }
}

export async function submitAssessmentCampaign(input: {
  organisationSlug: string
  campaignSlug: string
  payload: unknown
}): Promise<SubmitAssessmentCampaignResult> {
  const context = await loadPublicCampaignRuntimeContext({
    organisationSlug: input.organisationSlug,
    campaignSlug: input.campaignSlug,
  })
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  if (!context.primaryAssessment || context.primaryAssessment.status !== 'active') {
    return { ok: false, error: 'assessment_not_active' }
  }

  await warmPlatformSettings(context.adminClient)

  const parsed = CampaignSubmitSchema.safeParse(input.payload)
  if (!parsed.success) {
    return { ok: false, error: 'invalid_payload' }
  }

  const demographics = getCampaignDemographics(
    context.campaign.config.demographics_fields,
    context.campaign.config.demographics_enabled,
    parsed.data.demographics
  )
  const assessmentRows = (context.campaign.campaign_assessments ?? [])
    .filter((row) => row.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
  const requestedAssessmentId = typeof parsed.data.assessmentId === 'string' && parsed.data.assessmentId.trim()
    ? parsed.data.assessmentId.trim()
    : null
  const selectedAssessmentRow = requestedAssessmentId
    ? assessmentRows.find((row) => row.assessment_id === requestedAssessmentId || row.id === requestedAssessmentId) ?? null
    : assessmentRows[0] ?? null
  const selectedAssessment = Array.isArray(selectedAssessmentRow?.assessments)
    ? (selectedAssessmentRow?.assessments[0] ?? null)
    : (selectedAssessmentRow?.assessments ?? null)

  if (!selectedAssessment || selectedAssessment.status !== 'active') {
    return { ok: false, error: 'assessment_not_active' }
  }

  const isFinalAssessment = parsed.data.isFinalAssessment !== false

  let pipeline:
    | Awaited<ReturnType<typeof submitAssessment>>
    | null = null

  const participant = parseParticipant(parsed.data.participant)
  if (participant.ok) {
    const contactResult = await upsertContactByEmail(context.adminClient, {
      firstName: participant.data.firstName,
      lastName: participant.data.lastName,
      email: participant.data.email,
      source: `campaign:${input.organisationSlug}/${input.campaignSlug}`,
    })
    const contactId = contactResult.data?.id ?? null
    const participantRecord = await ensureAssessmentParticipant({
      client: context.adminClient,
      contactId,
      email: participant.data.email,
      firstName: participant.data.firstName,
      lastName: participant.data.lastName,
      organisation: participant.data.organisation || null,
      role: participant.data.role || null,
    })
    const participantId = participantRecord.data?.id ?? null

    if (context.campaign.config.registration_position !== 'before') {
      pipeline = await submitAssessment({
        adminClient: context.adminClient,
        assessmentId: selectedAssessment.id,
        responses: parsed.data.responses,
        campaignId: context.campaign.id,
        participant: {
          firstName: participant.data.firstName,
          lastName: participant.data.lastName,
          email: participant.data.email,
          organisation: participant.data.organisation || null,
          role: participant.data.role || null,
          contactId,
        },
        demographics,
        consent: parsed.data.consent ?? true,
      })
    } else {
      const reusableInvitation = await findExistingCampaignInvitation(
        context.adminClient,
        context.campaign.id,
        selectedAssessment.id,
        participant.data.email
      )
      const expiresAt = new Date(Date.now() + invitationExpiryMs()).toISOString()
      let invitationId = reusableInvitation?.id ?? null
      let invitationStartedAt = reusableInvitation?.started_at ?? null

      if (!invitationId) {
        const { data: invitationRow, error: invitationError } = await context.adminClient
          .from('assessment_invitations')
          .insert({
            assessment_id: selectedAssessment.id,
            campaign_id: context.campaign.id,
            participant_id: participantId,
            contact_id: contactId,
            email: participant.data.email,
            first_name: participant.data.firstName,
            last_name: participant.data.lastName,
            organisation: participant.data.organisation || null,
            role: participant.data.role || null,
            demographics,
            status: 'pending',
            expires_at: expiresAt,
          })
          .select('id, started_at')
          .single()

        if (invitationError || !invitationRow) {
          if (isCampaignLimitReachedError(invitationError)) {
            return { ok: false, error: 'campaign_limit_reached' }
          }
          console.error('[campaign-submit] invitation create failed', {
            campaignId: context.campaign.id,
            assessmentId: selectedAssessment.id,
            message: invitationError?.message ?? null,
            details: invitationError?.details ?? null,
            code: 'code' in (invitationError ?? {}) ? (invitationError as { code?: string | null }).code ?? null : null,
          })
          return { ok: false, error: 'invitation_create_failed' }
        }

        invitationId = invitationRow.id
        invitationStartedAt = invitationRow.started_at ?? null
      }

      if (!invitationId) {
        return { ok: false, error: 'invitation_create_failed' }
      }

      pipeline = await submitAssessment({
        adminClient: context.adminClient,
        assessmentId: selectedAssessment.id,
        responses: parsed.data.responses,
        campaignId: context.campaign.id,
        invitation: {
          id: invitationId,
          contactId,
          firstName: participant.data.firstName,
          lastName: participant.data.lastName,
          email: participant.data.email,
          organisation: participant.data.organisation || null,
          role: participant.data.role || null,
          startedAt: invitationStartedAt,
        },
        demographics,
        consent: true,
      })
    }
  } else if (
    context.campaign.config.registration_position === 'after' &&
    context.campaign.config.report_access !== 'gated'
  ) {
    return { ok: false, error: 'invalid_fields' }
  } else {
    // Registration-after and gated campaign paths are intentionally allowed to
    // create an anonymous submission first, then enrich identity later.
    pipeline = await submitAssessment({
      adminClient: context.adminClient,
      assessmentId: selectedAssessment.id,
      responses: parsed.data.responses,
      campaignId: context.campaign.id,
      participant: {
        firstName: null,
        lastName: null,
        email: null,
        organisation: null,
        role: null,
        contactId: null,
      },
      demographics,
      consent: true,
    })
  }

  if (!pipeline.ok) {
    return {
      ok: false,
      error: pipeline.error,
      assessmentId: selectedAssessment.id,
    }
  }

  if (!isFinalAssessment) {
    return {
      ok: true,
      assessmentId: selectedAssessment.id,
      data: { nextStep: 'complete_no_report' },
    }
  }

  if (context.campaign.config.report_access === 'none') {
    return {
      ok: true,
      assessmentId: selectedAssessment.id,
      data: { nextStep: 'complete_no_report' },
    }
  }

  if (context.campaign.config.report_access === 'gated') {
    if (participant.ok) {
      const { data: reportRows } = await context.adminClient
        .from('v2_assessment_reports')
        .select('id')
        .eq('assessment_id', selectedAssessment.id)
        .eq('report_kind', 'audience')
        .eq('status', 'published')
        .eq('is_default', true)
        .limit(1)
      const reportVariantId = reportRows?.[0]?.id ?? null

      const reportAccessToken = createReportAccessToken({
        report: pipeline.data.reportAccessKind ?? 'assessment',
        submissionId: pipeline.data.submissionId,
        reportVariantId,
        expiresInSeconds: reportAccessTtlSeconds(),
      })

      if (!reportAccessToken) {
        return {
          ok: false,
          error: 'missing_report_secret',
          assessmentId: selectedAssessment.id,
        }
      }

      return {
        ok: true,
        assessmentId: selectedAssessment.id,
        data: {
          submissionId: pipeline.data.submissionId,
          reportPath: pipeline.data.reportPath ?? '/assess/r/assessment',
          reportAccessToken,
        },
      }
    }

    if (process.env.NODE_ENV !== 'development' && !hasGateAccessTokenSecret()) {
      return {
        ok: false,
        error: 'missing_gate_secret',
        assessmentId: selectedAssessment.id,
      }
    }

    const gateToken = createGateAccessToken({
      submissionId: pipeline.data.submissionId,
      campaignId: context.campaign.id,
      assessmentId: selectedAssessment.id,
      expiresInSeconds: gateTokenTtlSeconds(),
    })

    if (!gateToken) {
      return {
        ok: false,
        error: 'missing_gate_secret',
        assessmentId: selectedAssessment.id,
      }
    }

    return {
      ok: true,
      assessmentId: selectedAssessment.id,
      data: {
        nextStep: 'contact_gate',
        gatePath: `/assess/contact?gate=${encodeURIComponent(gateToken)}`,
      },
    }
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return {
      ok: false,
      error: 'missing_report_secret',
      assessmentId: selectedAssessment.id,
    }
  }

  const { data: reportRows } = await context.adminClient
    .from('v2_assessment_reports')
    .select('id')
    .eq('assessment_id', selectedAssessment.id)
    .eq('report_kind', 'audience')
    .eq('status', 'published')
    .eq('is_default', true)
    .limit(1)
  const reportVariantId = reportRows?.[0]?.id ?? null

  const reportAccessToken = createReportAccessToken({
    report: pipeline.data.reportAccessKind ?? 'assessment',
    submissionId: pipeline.data.submissionId,
    reportVariantId,
    expiresInSeconds: reportAccessTtlSeconds(),
  })

  if (!reportAccessToken) {
    return {
      ok: false,
      error: 'missing_report_secret',
      assessmentId: selectedAssessment.id,
    }
  }

  return {
    ok: true,
    assessmentId: selectedAssessment.id,
    data: {
      submissionId: pipeline.data.submissionId,
      reportPath: pipeline.data.reportPath ?? '/assess/r/assessment',
      reportAccessToken,
    },
  }
}
