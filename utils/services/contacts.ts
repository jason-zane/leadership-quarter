import type { SupabaseClient } from '@supabase/supabase-js'

export type UpsertContactInput = {
  firstName: string
  lastName: string
  email: string
  source: string | null
}

type ContactRow = {
  id: string
  first_name: string
  last_name: string
  source: string | null
}

type ServiceResult<T> = {
  data: T | null
  error: string | null
  missingTable: boolean
}

function isMissingTableMessage(errorMessage: string, tableName: string) {
  const message = errorMessage.toLowerCase()
  return message.includes('relation') && message.includes(tableName)
}

export async function upsertContactByEmail(
  client: SupabaseClient,
  input: UpsertContactInput
): Promise<ServiceResult<{ id: string }>> {
  const normalizedEmail = input.email.toLowerCase()

  const { data: existing, error: selectError } = await client
    .from('contacts')
    .select('id, first_name, last_name, source')
    .eq('email_normalized', normalizedEmail)
    .maybeSingle()

  if (selectError) {
    return {
      data: null,
      error: selectError.message,
      missingTable: isMissingTableMessage(selectError.message, 'contacts'),
    }
  }

  if (!existing) {
    const { data: inserted, error: insertError } = await client
      .from('contacts')
      .insert({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        source: input.source,
        status: 'new',
      })
      .select('id')
      .single()

    if (insertError) {
      return {
        data: null,
        error: insertError.message,
        missingTable: isMissingTableMessage(insertError.message, 'contacts'),
      }
    }

    return {
      data: { id: inserted.id as string },
      error: null,
      missingTable: false,
    }
  }

  const existingRow = existing as ContactRow
  const nextSource = input.source ?? existingRow.source
  const shouldUpdate =
    existingRow.first_name !== input.firstName ||
    existingRow.last_name !== input.lastName ||
    existingRow.source !== nextSource

  if (shouldUpdate) {
    const { error: updateError } = await client
      .from('contacts')
      .update({
        first_name: input.firstName,
        last_name: input.lastName,
        source: nextSource,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingRow.id)

    if (updateError) {
      return {
        data: null,
        error: updateError.message,
        missingTable: isMissingTableMessage(updateError.message, 'contacts'),
      }
    }
  }

  return {
    data: { id: existingRow.id },
    error: null,
    missingTable: false,
  }
}

export async function createContactEvent(
  client: SupabaseClient,
  input: {
    contactId: string
    eventType: string
    eventData?: Record<string, string | null>
    note?: string | null
    actorUserId?: string | null
    createdAt?: string
  }
): Promise<{ error: string | null; missingTable: boolean }> {
  const { error } = await client.from('contact_events').insert({
    contact_id: input.contactId,
    event_type: input.eventType,
    event_data: input.eventData ?? {},
    note: input.note ?? null,
    actor_user_id: input.actorUserId ?? null,
    created_at: input.createdAt ?? new Date().toISOString(),
  })

  if (!error) {
    return { error: null, missingTable: false }
  }

  return {
    error: error.message,
    missingTable: isMissingTableMessage(error.message, 'contact_events'),
  }
}
