import type { SupabaseClient } from '@supabase/supabase-js'
import { listSubmissionReportOptions } from '@/utils/reports/report-variants'
import { createReportAccessToken } from '@/utils/security/report-access'

export type SubmissionReportOptionWithAccess = {
  key: string
  label: string
  description: string
  selectionMode: 'frozen_default' | 'latest_variant' | 'latest_campaign_default'
  reportVariantId: string | null
  currentDefault: boolean
  accessToken: string | null
}

export async function getSubmissionReportOptions(input: {
  adminClient: SupabaseClient
  submissionId: string
  expiresInSeconds?: number
}): Promise<SubmissionReportOptionWithAccess[]> {
  const options = await listSubmissionReportOptions({
    adminClient: input.adminClient,
    submissionId: input.submissionId,
  })
  const resolvedOptions = options.length > 0
    ? options
    : [{
        key: 'legacy_default',
        label: 'Current report',
        description: 'Use the assessment’s current default report configuration.',
        selectionMode: 'latest_campaign_default' as const,
        reportVariantId: null,
        currentDefault: true,
      }]

  return resolvedOptions.map((option) => ({
    ...option,
    accessToken: createReportAccessToken({
      report: 'assessment',
      submissionId: input.submissionId,
      selectionMode: option.selectionMode,
      reportVariantId: option.reportVariantId,
      expiresInSeconds: input.expiresInSeconds,
    }),
  }))
}
