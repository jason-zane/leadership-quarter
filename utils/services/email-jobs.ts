import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailTemplateKey } from '@/utils/email-templates'

export type TemplatedEmailJobPayload = {
  to: string
  templateKey: EmailTemplateKey
  variables: Record<string, string>
}

export type AssessmentReportEmailJobPayload = {
  submissionId: string
  to: string
  reportType?: 'assessment' | 'ai_survey'
}

export async function enqueueTemplatedEmailJob(
  client: SupabaseClient,
  payload: TemplatedEmailJobPayload
) {
  const { error } = await client.from('email_jobs').insert({
    status: 'pending',
    job_type: 'templated_email',
    payload,
    run_at: new Date().toISOString(),
  })

  return { error: error?.message ?? null }
}

export async function enqueueAssessmentReportEmailJob(
  client: SupabaseClient,
  payload: AssessmentReportEmailJobPayload
) {
  const { error } = await client.from('email_jobs').insert({
    status: 'pending',
    job_type: 'assessment_report_email',
    payload,
    run_at: new Date().toISOString(),
  })

  return { error: error?.message ?? null }
}
