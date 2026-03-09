import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { InvitationSubmitSchema } from '@/utils/assessments/submission-schema'
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
  demographics?: Record<string, string>
}

type CampaignEntryFailure = {
  ok: false
  error:
    | 'missing_service_role'
    | 'invalid_payload'
    | 'invalid_fields'
    | 'campaign_not_found'
    | 'campaign_not_active'
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

export async function registerAssessmentCampaignParticipant(input: {
  slug: string
  payload: RegisterPayload | null
}): Promise<RegisterAssessmentCampaignResult> {
  const firstName = String(input.payload?.firstName ?? '').trim()
  const lastName = String(input.payload?.lastName ?? '').trim()
  const email = String(input.payload?.email ?? '').trim().toLowerCase()
  const organisation = String(input.payload?.organisation ?? '').trim()
  const role = String(input.payload?.role ?? '').trim()

  if (!input.payload) {
    return { ok: false, error: 'invalid_payload' }
  }

  if (!firstName || !lastName || !isValidEmail(email)) {
    return { ok: false, error: 'invalid_fields' }
  }

  const context = await loadPublicCampaignContext(input.slug)
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  if (!context.primaryAssessment || context.primaryAssessment.status !== 'active') {
    return { ok: false, error: 'survey_not_active' }
  }

  const contactResult = await upsertContactByEmail(context.adminClient, {
    firstName,
    lastName,
    email,
    source: `campaign:${input.slug}`,
  })
  const contactId = contactResult.data?.id ?? null

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: invitationRow, error: invitationError } = await context.adminClient
    .from('assessment_invitations')
    .insert({
      assessment_id: context.primaryAssessment.id,
      campaign_id: context.campaign.id,
      contact_id: contactId,
      email,
      first_name: firstName,
      last_name: lastName,
      organisation: organisation || null,
      role: role || null,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id, token')
    .single()

  if (invitationError || !invitationRow) {
    return { ok: false, error: 'invitation_create_failed' }
  }

  if (context.campaign.config.registration_position === 'before') {
    const invitationUrl = `${getPortalBaseUrl()}/assess/i/${invitationRow.token}`
    const emailResult = await sendSurveyInvitationEmail({
      to: email,
      firstName,
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
      surveyPath: `/assess/i/${invitationRow.token}`,
    },
  }
}

export async function submitAssessmentCampaign(input: {
  slug: string
  payload: unknown
}): Promise<SubmitAssessmentCampaignResult> {
  const context = await loadPublicCampaignContext(input.slug)
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  if (!context.primaryAssessment || context.primaryAssessment.status !== 'active') {
    return { ok: false, error: 'assessment_not_active' }
  }

  const parsed = InvitationSubmitSchema.safeParse(input.payload)
  if (!parsed.success) {
    return { ok: false, error: 'invalid_payload' }
  }

  const pipeline = await submitAssessment({
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
    consent: true,
  })

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
    report: 'assessment',
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
      reportPath: '/assess/r/assessment',
      reportAccessToken,
    },
  }
}
