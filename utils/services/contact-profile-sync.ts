import type { SupabaseClient } from '@supabase/supabase-js'

type AnswerValue = string | number | boolean | null | undefined

type SyncInput = {
  contactId: string
  formKey: string
  submissionId: string | null
  answers: Record<string, AnswerValue>
}

function asText(value: AnswerValue) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function getPatchFromFormAnswers(formKey: string, answers: Record<string, AnswerValue>) {
  const patch: Record<string, string> = {}

  if (formKey === 'retreat_registration_v1' || formKey === 'general_registration_v1' || formKey === 'register_interest') {
    const fields: Array<[string, string]> = [
      ['age_range', 'age_range'],
      ['gender', 'gender'],
      ['gender_self_describe', 'gender_self_describe'],
      ['runner_type', 'runner_type'],
      ['location_label', 'location_label'],
      ['source', 'source'],
      ['retreat_slug', 'retreat_slug'],
      ['retreat_name', 'retreat_name'],
    ]

    for (const [answerKey, contactKey] of fields) {
      const value = asText(answers[answerKey])
      if (!value) continue
      patch[contactKey] = value
    }
  }

  if (formKey === 'retreat_profile_optional_v1') {
    const fields: Array<[string, string]> = [
      ['budget_range', 'budget_range'],
      ['retreat_style_preference', 'retreat_style_preference'],
      ['duration_preference', 'duration_preference'],
      ['travel_radius', 'travel_radius'],
      ['accommodation_preference', 'accommodation_preference'],
      ['community_vs_performance', 'community_vs_performance'],
      ['preferred_season', 'preferred_season'],
      ['gender_optional', 'gender_optional'],
      ['life_stage_optional', 'life_stage_optional'],
      ['what_would_make_it_great', 'what_would_make_it_great'],
      ['retreat_slug', 'retreat_slug'],
      ['retreat_name', 'retreat_name'],
      ['source', 'source'],
    ]

    for (const [answerKey, contactKey] of fields) {
      const value = asText(answers[answerKey])
      if (!value) continue
      patch[contactKey] = value
    }
  }

  return patch
}

export async function syncContactProfileFromSubmission(
  client: SupabaseClient,
  input: SyncInput
): Promise<{ changedFields: string[]; error: string | null }> {
  const patch = getPatchFromFormAnswers(input.formKey, input.answers)
  if (Object.keys(patch).length === 0) {
    return { changedFields: [], error: null }
  }

  const { data: currentData, error: currentError } = await client
    .from('contacts')
    .select(Object.keys(patch).join(', '))
    .eq('id', input.contactId)
    .maybeSingle()

  if (currentError || !currentData) {
    return { changedFields: [], error: currentError?.message ?? 'contact_not_found' }
  }

  const current = currentData as unknown as Record<string, string | null>
  const changedFields: string[] = []
  const updates: Record<string, string> = {}

  for (const [field, nextValue] of Object.entries(patch)) {
    const currentValue = String(current[field] ?? '').trim()
    if (currentValue === nextValue) continue
    updates[field] = nextValue
    changedFields.push(field)
  }

  if (changedFields.length === 0) {
    return { changedFields: [], error: null }
  }

  const now = new Date().toISOString()
  const { error: updateError } = await client
    .from('contacts')
    .update({ ...updates, profile_v2_updated_at: now, updated_at: now })
    .eq('id', input.contactId)

  if (updateError) {
    return { changedFields: [], error: updateError.message }
  }

  await client.from('contact_events').insert({
    contact_id: input.contactId,
    event_type: 'profile_synced',
    event_data: {
      submission_id: input.submissionId,
      form_key: input.formKey,
      changed_fields: changedFields.join(', '),
    },
  })

  return { changedFields, error: null }
}
