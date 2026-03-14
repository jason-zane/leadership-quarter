import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { CampaignSubmitSchema } from '@/utils/assessments/submission-schema'
import {
  sanitizeDemographicsRecord,
  type CampaignDemographics,
} from '@/utils/assessments/campaign-types'
import { getPortalBaseUrl } from '@/utils/hosts'
import {
  createGateAccessToken,
  createReportAccessToken,
  hasGateAccessTokenSecret,
  hasReportAccessTokenSecret,
} from '@/utils/security/report-access'
import { loadPublicCampaignContext } from '@/utils/services/assessment-campaign-context'
import { upsertContactByEmail } from '@/utils/services/contacts'

type RegisterPayload = {
  firstName?: string
  lastName?: string
  email?: string
  organisation?: string
  role?: string
  demographics?: CampaignDemographics
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

export async function registerAssessmentCampaignParticipant(input: {
  organisationSlug: string
  campaignSlug: string
  payload: RegisterPayload | null
  runtimeMode?: 'default' | 'v2'
}): Promise<RegisterAssessmentCampaignResult> {
  if (!input.payload) {
    return { ok: false, error: 'invalid_payload' }
  }

  const participant = parseParticipant(input.payload)
  if (!participant.ok) {
    return { ok: false, error: 'invalid_fields' }
  }

  const context = await loadPublicCampaignContext({
    organisationSlug: input.organisationSlug,
    campaignSlug: input.campaignSlug,
  })
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  if (!context.primaryAssessment || context.primaryAssessment.status !== 'active') {
    return { ok: false, error: 'survey_not_active' }
  }

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

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: invitationRow, error: invitationError } = await context.adminClient
    .from('assessment_invitations')
    .insert({
      assessment_id: context.primaryAssessment.id,
      campaign_id: context.campaign.id,
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
    return { ok: false, error: 'invitation_create_failed' }
  }

  if (context.campaign.config.registration_position === 'before') {
    const invitationUrl = `${getPortalBaseUrl()}/assess/i/${invitationRow.token}`
    const emailResult = await sendSurveyInvitationEmail({
      to: participant.data.email,
      firstName: participant.data.firstName,
      surveyName: context.primaryAssessment.name,
      invitationUrl,
    })

    if (emailResult.ok) {
      await context.adminClient
        .from('assessment_invitations')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invitationRow.id)
    } else {
      console.error('[campaign-register] invitation email failed:', emailResult.error)
    }
  }

  return {
    ok: true,
    data: {
      token: invitationRow.token,
      surveyPath: `/assess/i/${invitationRow.token}${input.runtimeMode === 'v2' ? '?engine=v2' : ''}`,
    },
  }
}

export async function submitAssessmentCampaign(input: {
  organisationSlug: string
  campaignSlug: string
  payload: unknown
  runtimeMode?: 'default' | 'v2'
}): Promise<SubmitAssessmentCampaignResult> {
  const context = await loadPublicCampaignContext({
    organisationSlug: input.organisationSlug,
    campaignSlug: input.campaignSlug,
  })
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  if (!context.primaryAssessment || context.primaryAssessment.status !== 'active') {
    return { ok: false, error: 'assessment_not_active' }
  }

  const parsed = CampaignSubmitSchema.safeParse(input.payload)
  if (!parsed.success) {
    return { ok: false, error: 'invalid_payload' }
  }

  const demographics = getCampaignDemographics(
    context.campaign.config.demographics_fields,
    context.campaign.config.demographics_enabled,
    parsed.data.demographics
  )

  let pipeline:
    | Awaited<ReturnType<typeof submitAssessment>>
    | null = null

  if (
    context.campaign.config.registration_position === 'after' &&
    context.campaign.config.report_access !== 'gated'
  ) {
    const participant = parseParticipant(parsed.data.participant)
    if (!participant.ok) {
      return { ok: false, error: 'invalid_fields' }
    }

    const contactResult = await upsertContactByEmail(context.adminClient, {
      firstName: participant.data.firstName,
      lastName: participant.data.lastName,
      email: participant.data.email,
      source: `campaign:${input.organisationSlug}/${input.campaignSlug}`,
    })
    const contactId = contactResult.data?.id ?? null

    const { data: invitationRow, error: invitationError } = await context.adminClient
      .from('assessment_invitations')
      .insert({
        assessment_id: context.primaryAssessment.id,
        campaign_id: context.campaign.id,
        contact_id: contactId,
        email: participant.data.email,
        first_name: participant.data.firstName,
        last_name: participant.data.lastName,
        organisation: participant.data.organisation || null,
        role: participant.data.role || null,
        demographics,
        status: 'pending',
      })
      .select('id, started_at')
      .single()

    if (invitationError || !invitationRow) {
      if (isCampaignLimitReachedError(invitationError)) {
        return { ok: false, error: 'campaign_limit_reached' }
      }
      return { ok: false, error: 'invitation_create_failed' }
    }

    pipeline = await submitAssessment({
      adminClient: context.adminClient,
      assessmentId: context.primaryAssessment.id,
      responses: parsed.data.responses,
      campaignId: context.campaign.id,
      invitation: {
        id: invitationRow.id,
        contactId,
        firstName: participant.data.firstName,
        lastName: participant.data.lastName,
        email: participant.data.email,
        organisation: participant.data.organisation || null,
        role: participant.data.role || null,
        startedAt: invitationRow.started_at ?? null,
      },
      demographics,
      consent: true,
      runtimeMode: input.runtimeMode,
    })
  } else {
    pipeline = await submitAssessment({
      adminClient: context.adminClient,
      assessmentId: context.primaryAssessment.id,
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
      runtimeMode: input.runtimeMode,
    })
  }

  if (!pipeline.ok) {
    return {
      ok: false,
      error: pipeline.error,
      assessmentId: context.primaryAssessment.id,
    }
  }

  if (context.campaign.config.report_access === 'none') {
    return {
      ok: true,
      assessmentId: context.primaryAssessment.id,
      data: { nextStep: 'complete_no_report' },
    }
  }

  if (context.campaign.config.report_access === 'gated') {
    if (process.env.NODE_ENV !== 'development' && !hasGateAccessTokenSecret()) {
      return {
        ok: false,
        error: 'missing_gate_secret',
        assessmentId: context.primaryAssessment.id,
      }
    }

    const gateToken = createGateAccessToken({
      submissionId: pipeline.data.submissionId,
      campaignId: context.campaign.id,
      assessmentId: context.primaryAssessment.id,
      expiresInSeconds: 24 * 60 * 60,
    })

    if (!gateToken) {
      return {
        ok: false,
        error: 'missing_gate_secret',
        assessmentId: context.primaryAssessment.id,
      }
    }

    return {
      ok: true,
      assessmentId: context.primaryAssessment.id,
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
      assessmentId: context.primaryAssessment.id,
    }
  }

  const reportAccessToken = createReportAccessToken({
    report: pipeline.data.reportAccessKind ?? 'assessment',
    submissionId: pipeline.data.submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })

  if (!reportAccessToken) {
    return {
      ok: false,
      error: 'missing_report_secret',
      assessmentId: context.primaryAssessment.id,
    }
  }

  return {
    ok: true,
    assessmentId: context.primaryAssessment.id,
    data: {
      submissionId: pipeline.data.submissionId,
      reportPath: pipeline.data.reportPath ?? '/assess/r/assessment',
      reportAccessToken,
    },
  }
}
