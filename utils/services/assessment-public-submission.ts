import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import {
  createReportAccessToken,
  hasReportAccessTokenSecret,
} from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'

export type SubmitPublicAssessmentPayload = {
  responses?: Record<string, number>
}

export type SubmitPublicAssessmentResult =
  | {
      ok: true
      data: {
        submissionId: string
        reportPath: '/assess/r/assessment'
        reportAccessToken: string
      }
    }
  | {
      ok: false
      error:
        | 'missing_service_role'
        | 'missing_report_secret'
        | 'invalid_payload'
        | 'assessment_selector_required'
        | 'assessment_not_found'
        | 'assessment_not_active'
        | 'questions_load_failed'
        | 'invalid_responses'
        | 'submission_failed'
        | 'classification_failed'
    }

export async function submitPublicAssessment(input: {
  assessmentKey: string
  payload: SubmitPublicAssessmentPayload | null
}): Promise<SubmitPublicAssessmentResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { ok: false, error: 'missing_service_role' }
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return { ok: false, error: 'missing_report_secret' }
  }

  if (!input.payload?.responses) {
    return { ok: false, error: 'invalid_payload' }
  }

  const pipeline = await submitAssessment({
    adminClient,
    assessmentKey: input.assessmentKey,
    responses: input.payload.responses,
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
    return { ok: false, error: pipeline.error }
  }

  const reportAccessToken = createReportAccessToken({
    report: pipeline.data.reportAccessKind ?? 'assessment',
    submissionId: pipeline.data.submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })

  if (!reportAccessToken) {
    return { ok: false, error: 'missing_report_secret' }
  }

  return {
    ok: true,
    data: {
      submissionId: pipeline.data.submissionId,
        reportPath: pipeline.data.reportPath ?? '/assess/r/assessment',
        reportAccessToken,
      },
  }
}
