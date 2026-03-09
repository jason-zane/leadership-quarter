import { getAiOrientationSurveyReportData } from '@/utils/reports/ai-orientation-report'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { enqueueAssessmentReportEmailJob } from '@/utils/services/email-jobs'
import { createAdminClient } from '@/utils/supabase/admin'

export type ResolveAiSurveyReportEmailAccessResult =
  | {
      ok: true
      submissionId: string
    }
  | {
      ok: false
      error: 'invalid_access'
      message: 'This report link is no longer valid.'
    }

export type QueueAiSurveyReportEmailResult =
  | {
      ok: true
      data: {
        message: string
      }
    }
  | {
      ok: false
      error:
        | 'missing_service_role'
        | 'report_not_found'
        | 'missing_recipient_email'
        | 'queue_failed'
      message: string
    }

export function resolveAiSurveyReportEmailAccess(
  access: string
): ResolveAiSurveyReportEmailAccessResult {
  const payload = access ? verifyReportAccessToken(access, 'ai_survey') : null

  if (!payload) {
    return {
      ok: false,
      error: 'invalid_access',
      message: 'This report link is no longer valid.',
    }
  }

  return {
    ok: true,
    submissionId: payload.submissionId,
  }
}

export async function queueAiSurveyReportEmail(input: {
  submissionId: string
}): Promise<QueueAiSurveyReportEmailResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
      message: 'Email sending is not configured.',
    }
  }

  const report = await getAiOrientationSurveyReportData(adminClient, input.submissionId)
  if (!report) {
    return {
      ok: false,
      error: 'report_not_found',
      message: 'We could not load this report.',
    }
  }

  const recipientEmail = report.email?.trim().toLowerCase() || null
  if (!recipientEmail) {
    return {
      ok: false,
      error: 'missing_recipient_email',
      message: 'No email address is available for this report.',
    }
  }

  const queued = await enqueueAssessmentReportEmailJob(adminClient, {
    submissionId: report.submissionId,
    to: recipientEmail,
    reportType: 'ai_survey',
  })

  if (queued.error) {
    return {
      ok: false,
      error: 'queue_failed',
      message: 'Could not queue the report email.',
    }
  }

  return {
    ok: true,
    data: {
      message: `Report link email queued for ${recipientEmail}.`,
    },
  }
}
