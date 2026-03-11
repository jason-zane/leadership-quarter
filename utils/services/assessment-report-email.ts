import { getAssessmentReportData, getAssessmentReportRecipientEmail } from '@/utils/reports/assessment-report'
import type { ReportSelectionMode } from '@/utils/reports/report-variants'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { enqueueAssessmentReportEmailJob } from '@/utils/services/email-jobs'
import { createAdminClient } from '@/utils/supabase/admin'

export type ResolveAssessmentReportEmailAccessResult =
  | {
      ok: true
      submissionId: string
      selectionMode: ReportSelectionMode | null
      reportVariantId: string | null
    }
  | {
      ok: false
      error: 'invalid_access'
      message: 'This report link is no longer valid.'
    }

export type QueueAssessmentReportEmailResult =
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

export function resolveAssessmentReportEmailAccess(
  access: string
): ResolveAssessmentReportEmailAccessResult {
  const payload = access ? verifyReportAccessToken(access, 'assessment') : null

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
    selectionMode: payload.selectionMode,
    reportVariantId: payload.reportVariantId,
  }
}

export async function queueAssessmentReportEmail(input: {
  submissionId: string
  selectionMode?: ReportSelectionMode | null
  reportVariantId?: string | null
}): Promise<QueueAssessmentReportEmailResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
      message: 'Email sending is not configured.',
    }
  }

  const report = await getAssessmentReportData(adminClient, input.submissionId)
  if (!report) {
    return {
      ok: false,
      error: 'report_not_found',
      message: 'We could not load this report.',
    }
  }

  const recipientEmail = getAssessmentReportRecipientEmail(report)
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
    selectionMode: input.selectionMode ?? null,
    reportVariantId: input.reportVariantId ?? null,
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
