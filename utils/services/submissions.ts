import type { SupabaseClient } from '@supabase/supabase-js'

export type CreateInterestSubmissionInput = {
  firstName: string
  lastName: string
  email: string
  source: string | null
  formKey?: string
  schemaVersion?: number
  answers: Record<string, string | number | boolean | null>
  rawPayload: Record<string, string | number | boolean | null>
  reviewStatus?: 'pending_review' | 'approved' | 'changes_requested'
  priority?: 'low' | 'normal' | 'high'
  ipAddress: string | null
  userAgent: string | null
}

type ServiceResult<T> = {
  data: T | null
  error: string | null
  missingTable: boolean
}

export async function createInterestSubmission(
  client: SupabaseClient,
  input: CreateInterestSubmissionInput
): Promise<ServiceResult<{ id: string }>> {
  const { data, error } = await client
    .from('interest_submissions')
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      source: input.source,
      form_key: input.formKey ?? 'register_interest',
      schema_version: input.schemaVersion ?? 1,
      answers: input.answers,
      raw_payload: input.rawPayload,
      review_status: input.reviewStatus ?? 'approved',
      priority: input.priority ?? 'normal',
      updated_at: new Date().toISOString(),
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
    })
    .select('id')
    .single()

  if (!error) {
    return {
      data: { id: data.id as string },
      error: null,
      missingTable: false,
    }
  }

  const message = error.message.toLowerCase()
  return {
    data: null,
    error: error.message,
    missingTable: message.includes('relation') && message.includes('interest_submissions'),
  }
}

export async function linkSubmissionToContact(
  client: SupabaseClient,
  submissionId: string,
  contactId: string
): Promise<{ error: string | null }> {
  const { error } = await client
    .from('interest_submissions')
    .update({ contact_id: contactId })
    .eq('id', submissionId)

  return { error: error?.message ?? null }
}

export async function createSubmissionEvent(
  client: SupabaseClient,
  input: {
    submissionId: string
    eventType: string
    eventData?: Record<string, string | number | boolean | null>
    actorUserId?: string | null
  }
): Promise<{ error: string | null }> {
  const { error } = await client.from('submission_events').insert({
    submission_id: input.submissionId,
    event_type: input.eventType,
    event_data: input.eventData ?? {},
    actor_user_id: input.actorUserId ?? null,
  })

  return { error: error?.message ?? null }
}
