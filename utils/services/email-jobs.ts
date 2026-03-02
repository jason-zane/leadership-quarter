import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailTemplateKey } from '@/utils/email-templates'

export type TemplatedEmailJobPayload = {
  to: string
  templateKey: EmailTemplateKey
  variables: Record<string, string>
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
