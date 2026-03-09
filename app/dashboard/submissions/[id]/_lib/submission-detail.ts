import type { SupabaseClient } from '@supabase/supabase-js'

export type SubmissionRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  source: string | null
  status: string
  review_status: string
  form_key: string
  schema_version: number
  priority: string
  created_at: string
  updated_at: string
  first_response_at: string | null
  reviewed_at: string | null
  owner_user_id: string | null
  contact_id: string | null
  answers: Record<string, string | number | null>
  raw_payload: Record<string, string | number | null>
}

export type SubmissionFieldReview = {
  id: string
  field_key: string
  proposed_value: string | number | null
  existing_value: string | number | null
  decision: string
  note: string | null
  created_at: string
  decided_at: string | null
}

export type SubmissionEvent = {
  id: string
  event_type: string
  event_data: Record<string, string | number | boolean | null>
  created_at: string
}

export type OwnerProfile = {
  user_id: string
  full_name: string | null
}

export const feedbackMessages: Record<string, string> = {
  status: 'Status updated.',
  owner: 'Owner updated.',
  priority: 'Priority updated.',
  first_response: 'First response timestamp recorded.',
  review: 'Field review decision saved.',
  linked: 'Contact linked.',
}

export const errorMessages: Record<string, string> = {
  review_update_failed: 'Could not save review decision.',
  owner_update_failed: 'Could not update owner.',
  priority_update_failed: 'Could not update priority.',
  first_response_failed: 'Could not record first response.',
  submission_status_failed: 'Could not update status.',
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '-'
  }

  return String(value)
}

export function sortAnswerEntries(answers: Record<string, string | number | null>) {
  return Object.entries(answers).sort(([left], [right]) => left.localeCompare(right))
}

export async function loadSubmissionDetailData(adminClient: SupabaseClient, submissionId: string) {
  const [
    { data: submissionData, error: submissionError },
    { data: reviewsData, error: reviewsError },
    { data: eventsData, error: eventsError },
    { data: ownerData },
  ] = await Promise.all([
    adminClient
      .from('interest_submissions')
      .select(
        'id, first_name, last_name, email, source, status, review_status, form_key, schema_version, priority, created_at, updated_at, first_response_at, reviewed_at, owner_user_id, contact_id, answers, raw_payload'
      )
      .eq('id', submissionId)
      .maybeSingle(),
    adminClient
      .from('submission_field_reviews')
      .select('id, field_key, proposed_value, existing_value, decision, note, created_at, decided_at')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true }),
    adminClient
      .from('submission_events')
      .select('id, event_type, event_data, created_at')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: false })
      .limit(100),
    adminClient.from('profiles').select('user_id, full_name').order('full_name', { ascending: true }),
  ])

  return {
    submission: submissionData as SubmissionRow | null,
    submissionError,
    reviews: ((reviewsError ? [] : reviewsData) ?? []) as SubmissionFieldReview[],
    events: ((eventsError ? [] : eventsData) ?? []) as SubmissionEvent[],
    owners: (ownerData ?? []) as OwnerProfile[],
  }
}
