import { reportAccessTtlSeconds, warmPlatformSettings } from '@/utils/services/platform-settings-runtime'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { InvitationSubmitSchema } from '@/utils/assessments/submission-schema'
import {
  normalizeCampaignConfig,
  sanitizeDemographicsRecord,
  type CampaignDemographics,
} from '@/utils/assessments/campaign-types'
import { getPublicBaseUrl } from '@/utils/hosts'
import {
  createReportAccessToken,
  hasReportAccessTokenSecret,
} from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'

type InvitationAssessmentRelation = {
  id: string
  key?: string
  name: string
  status: string
  report_config?: unknown
}

type InvitationRow = {
  id: string
  assessment_id: string
  token: string
  email: string | null
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  contact_id: string | null
  campaign_id: string | null
  demographics: CampaignDemographics | null
  status: string | null
  started_at: string | null
  completed_at: string | null
  expires_at: string | null
  assessments: InvitationAssessmentRelation | InvitationAssessmentRelation[] | null
}

type SubmissionResultMeta = {
  invitationId?: string
  assessmentId?: string
}

type SubmissionPipelineError =
  | 'assessment_selector_required'
  | 'assessment_not_found'
  | 'assessment_not_active'
  | 'questions_load_failed'
  | 'invalid_responses'
  | 'submission_failed'
  | 'classification_failed'

export type SubmitAssessmentInvitationResult =
  | ({
      ok: true
      data:
        | {
            nextStep: 'complete_no_report'
          }
        | {
            submissionId: string
            reportAccessToken: string
            reportPath: '/assess/r/assessment'
            scores?: Record<string, number>
            bands?: Record<string, string>
            classification?: { key: string; label: string } | null
            recommendations?: string[]
          }
    } & SubmissionResultMeta)
  | ({
      ok: false
      error:
        | 'missing_service_role'
        | 'missing_report_secret'
        | 'invalid_payload'
        | 'invitation_not_found'
        | 'survey_not_active'
        | 'invitation_expired'
        | 'invitation_completed'
        | SubmissionPipelineError
      message?: string
    } & SubmissionResultMeta)

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

async function resolveInvitationDemographics(input: {
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>
  campaignId: string | null
  invitationDemographics: CampaignDemographics | null
  payloadDemographics: CampaignDemographics | undefined
}) {
  if (!input.payloadDemographics || !input.campaignId) {
    return input.invitationDemographics
  }

  const { data: campaignRow } = await input.adminClient
    .from('campaigns')
    .select('config')
    .eq('id', input.campaignId)
    .maybeSingle()

  const config = normalizeCampaignConfig(campaignRow?.config ?? null)
  if (!config.demographics_enabled) {
    return input.invitationDemographics
  }

  return sanitizeDemographicsRecord(config.demographics_fields, input.payloadDemographics)
}

export async function submitAssessmentInvitation(input: {
  token: string
  payload: unknown
}): Promise<SubmitAssessmentInvitationResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    }
  }

  await warmPlatformSettings(adminClient)

  const parsed = InvitationSubmitSchema.safeParse(input.payload)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'invalid_payload',
    }
  }

  const { responses } = parsed.data
  const isFinalAssessment = parsed.data.isFinalAssessment !== false

  const { data: invitationRow, error } = await adminClient
    .from('assessment_invitations')
    .select(
      'id, assessment_id, token, email, first_name, last_name, organisation, role, contact_id, campaign_id, demographics, status, started_at, completed_at, expires_at, assessments(id, key, name:external_name, status, report_config)'
    )
    .eq('token', input.token)
    .maybeSingle()

  if (error || !invitationRow) {
    return {
      ok: false,
      error: 'invitation_not_found',
    }
  }

  const invitation = invitationRow as InvitationRow
  const assessment = pickRelation(invitation.assessments)

  if (!assessment || assessment.status !== 'active') {
    return {
      ok: false,
      error: 'survey_not_active',
      invitationId: invitation.id,
      assessmentId: assessment?.id,
    }
  }

  if (isExpired(invitation.expires_at)) {
    await adminClient
      .from('assessment_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return {
      ok: false,
      error: 'invitation_expired',
      invitationId: invitation.id,
      assessmentId: invitation.assessment_id,
    }
  }

  if (invitation.status === 'completed' || invitation.completed_at) {
    const { data: existingSubmission } = await adminClient
      .from('assessment_submissions')
      .select('id, report_access_token, v2_runtime_metadata')
      .eq('invitation_id', invitation.id)
      .maybeSingle()

    if (existingSubmission?.report_access_token) {
      return {
        ok: true,
        invitationId: invitation.id,
        assessmentId: invitation.assessment_id,
        data: {
          submissionId: existingSubmission.id,
          reportAccessToken: existingSubmission.report_access_token,
          reportPath: '/assess/r/assessment',
        },
      }
    }

    return {
      ok: false,
      error: 'invitation_completed',
      invitationId: invitation.id,
      assessmentId: invitation.assessment_id,
    }
  }

  const demographics = await resolveInvitationDemographics({
    adminClient,
    campaignId: invitation.campaign_id,
    invitationDemographics: invitation.demographics,
    payloadDemographics: parsed.data.demographics,
  })

  const pipeline = await submitAssessment({
    adminClient,
    assessmentId: invitation.assessment_id,
    responses,
    invitation: {
      id: invitation.id,
      contactId: invitation.contact_id,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      email: invitation.email,
      organisation: invitation.organisation,
      role: invitation.role,
      startedAt: invitation.started_at,
    },
    campaignId: invitation.campaign_id,
    demographics,
    consent: true,
  })

  if (!pipeline.ok) {
    return {
      ok: false,
      error: pipeline.error,
      invitationId: invitation.id,
      assessmentId: invitation.assessment_id,
    }
  }

  if (!isFinalAssessment) {
    return {
      ok: true,
      invitationId: invitation.id,
      assessmentId: invitation.assessment_id,
      data: {
        nextStep: 'complete_no_report',
      },
    }
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return {
      ok: false,
      error: 'missing_report_secret',
      message: 'Report access token secret is not configured.',
    }
  }

  const { data: reportRows } = await adminClient
    .from('v2_assessment_reports')
    .select('id')
    .eq('assessment_id', invitation.assessment_id)
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
      invitationId: invitation.id,
      assessmentId: invitation.assessment_id,
    }
  }

  const reportPath = pipeline.data.reportPath ?? '/assess/r/assessment'
  const reportUrl = `${getPublicBaseUrl()}${reportPath}?access=${encodeURIComponent(reportAccessToken)}`

  const { error: emailJobError } = await adminClient.from('email_jobs').insert({
    job_type: 'assessment_completion',
    payload: {
      to: invitation.email,
      firstName: invitation.first_name,
      surveyName: assessment.name,
      classificationLabel: pipeline.data.classification?.label ?? 'Assessment complete',
      reportUrl,
    },
    status: 'pending',
    run_at: new Date().toISOString(),
  })

  if (emailJobError) {
    console.error('[submit] Failed to queue assessment_completion email job:', emailJobError.message)
  }

  return {
    ok: true,
    invitationId: invitation.id,
    assessmentId: invitation.assessment_id,
    data: {
      submissionId: pipeline.data.submissionId,
      reportAccessToken,
      reportPath,
      scores: pipeline.data.scores,
      bands: pipeline.data.bands,
      classification: pipeline.data.classification,
      recommendations: pipeline.data.recommendations,
    },
  }
}
