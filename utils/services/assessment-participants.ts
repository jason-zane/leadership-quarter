import type { SupabaseClient } from '@supabase/supabase-js'

type ParticipantRow = {
  id: string
  contact_id: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  status: 'active' | 'archived'
}

function normalizeText(value: string | null | undefined) {
  const text = (value ?? '').trim()
  return text.length > 0 ? text : null
}

function normalizeEmail(value: string | null | undefined) {
  const text = normalizeText(value)
  return text ? text.toLowerCase() : null
}

function isMissingTableMessage(errorMessage: string, tableName: string) {
  const message = errorMessage.toLowerCase()
  return message.includes('relation') && message.includes(tableName)
}

async function maybeSelectParticipantByContactId(client: SupabaseClient, contactId: string) {
  const table = client.from('assessment_participants') as unknown as {
    select?: (...args: unknown[]) => {
      eq: (field: string, value: string) => {
        maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
      }
    }
  }
  if (typeof table.select !== 'function') {
    return { row: null, error: null, missingTable: false }
  }

  const { data, error } = await table
    .select('id, contact_id, email, first_name, last_name, organisation, role, status')
    .eq('contact_id', contactId)
    .maybeSingle()

  if (error) {
    return {
      row: null,
      error: error.message,
      missingTable: isMissingTableMessage(error.message, 'assessment_participants'),
    }
  }

  return { row: (data as ParticipantRow | null) ?? null, error: null, missingTable: false }
}

async function maybeSelectParticipantByEmail(client: SupabaseClient, email: string) {
  const table = client.from('assessment_participants') as unknown as {
    select?: (...args: unknown[]) => {
      eq: (field: string, value: string) => {
        order: (field: string, options: { ascending: boolean }) => {
          limit: (count: number) => {
            maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
          }
        }
      }
    }
  }
  if (typeof table.select !== 'function') {
    return { row: null, error: null, missingTable: false }
  }

  const { data, error } = await table
    .select('id, contact_id, email, first_name, last_name, organisation, role, status')
    .eq('email_normalized', email)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return {
      row: null,
      error: error.message,
      missingTable: isMissingTableMessage(error.message, 'assessment_participants'),
    }
  }

  return { row: (data as ParticipantRow | null) ?? null, error: null, missingTable: false }
}

async function updateParticipantReferences(input: {
  client: SupabaseClient
  fromParticipantId: string
  toParticipantId: string
}) {
  const invitationsTable = input.client.from('assessment_invitations') as unknown as {
    update?: (payload: Record<string, string>) => {
      eq: (field: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  }
  const submissionsTable = input.client.from('assessment_submissions') as unknown as {
    update?: (payload: Record<string, string>) => {
      eq: (field: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  }

  if (typeof invitationsTable.update === 'function') {
    await invitationsTable
      .update({ participant_id: input.toParticipantId })
      .eq('participant_id', input.fromParticipantId)
  }

  if (typeof submissionsTable.update === 'function') {
    await submissionsTable
      .update({ participant_id: input.toParticipantId })
      .eq('participant_id', input.fromParticipantId)
  }
}

async function deleteParticipantRecord(client: SupabaseClient, participantId: string) {
  const table = client.from('assessment_participants') as unknown as {
    delete?: () => {
      eq: (field: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  }
  if (typeof table.delete !== 'function') return { error: null }
  const { error } = await table.delete().eq('id', participantId)
  return { error: error?.message ?? null }
}

async function patchParticipantRecord(input: {
  client: SupabaseClient
  participantId: string
  patch: Record<string, string | null>
}) {
  if (Object.keys(input.patch).length === 0) return { error: null, missingTable: false }

  const { error } = await input.client
    .from('assessment_participants')
    .update({
      ...input.patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.participantId)

  if (!error) {
    return { error: null, missingTable: false }
  }

  return {
    error: error.message,
    missingTable: isMissingTableMessage(error.message, 'assessment_participants'),
  }
}

export async function ensureAssessmentParticipant(input: {
  client: SupabaseClient
  contactId?: string | null
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  organisation?: string | null
  role?: string | null
}) {
  const contactId = normalizeText(input.contactId)
  const email = normalizeEmail(input.email)
  const firstName = normalizeText(input.firstName)
  const lastName = normalizeText(input.lastName)
  const organisation = normalizeText(input.organisation)
  const role = normalizeText(input.role)

  if (!contactId && !email) {
    return {
      data: null,
      error: null,
      missingTable: false,
    }
  }

  const byContact = contactId ? await maybeSelectParticipantByContactId(input.client, contactId) : null
  if (byContact?.error) {
    return { data: null, error: byContact.error, missingTable: byContact.missingTable }
  }

  const byEmail = email ? await maybeSelectParticipantByEmail(input.client, email) : null
  if (byEmail?.error) {
    return { data: null, error: byEmail.error, missingTable: byEmail.missingTable }
  }

  const contactRow = byContact?.row ?? null
  const emailRow = byEmail?.row ?? null

  if (contactRow && emailRow && contactRow.id !== emailRow.id) {
    await updateParticipantReferences({
      client: input.client,
      fromParticipantId: emailRow.id,
      toParticipantId: contactRow.id,
    })

    const mergePatch: Record<string, string | null> = {}
    if (email && contactRow.email !== email) mergePatch.email = email
    if (firstName && !contactRow.first_name) mergePatch.first_name = firstName
    if (lastName && !contactRow.last_name) mergePatch.last_name = lastName
    if (organisation && !contactRow.organisation) mergePatch.organisation = organisation
    if (role && !contactRow.role) mergePatch.role = role

    const patchResult = await patchParticipantRecord({
      client: input.client,
      participantId: contactRow.id,
      patch: mergePatch,
    })
    if (patchResult.error) {
      return { data: null, error: patchResult.error, missingTable: patchResult.missingTable }
    }

    const deleteResult = await deleteParticipantRecord(input.client, emailRow.id)
    if (deleteResult.error) {
      return { data: null, error: deleteResult.error, missingTable: false }
    }

    return {
      data: { id: contactRow.id, status: contactRow.status },
      error: null,
      missingTable: false,
    }
  }

  const existing = contactRow ?? emailRow ?? null
  if (existing) {
    const patch: Record<string, string | null> = {}

    if (contactId && existing.contact_id !== contactId) patch.contact_id = contactId
    if (email && existing.email !== email) patch.email = email
    if (firstName && existing.first_name !== firstName) patch.first_name = firstName
    if (lastName && existing.last_name !== lastName) patch.last_name = lastName
    if (organisation && existing.organisation !== organisation) patch.organisation = organisation
    if (role && existing.role !== role) patch.role = role
    if (Object.keys(patch).length > 0) {
      const patchResult = await patchParticipantRecord({
        client: input.client,
        participantId: existing.id,
        patch,
      })

      if (patchResult.error) {
        return {
          data: null,
          error: patchResult.error,
          missingTable: patchResult.missingTable,
        }
      }
    }

    return {
      data: { id: existing.id, status: existing.status },
      error: null,
      missingTable: false,
    }
  }

  const insertTable = input.client.from('assessment_participants') as unknown as {
    insert?: (payload: Record<string, string | null>) => {
      select?: (columns: string) => {
        single?: () => Promise<{ data: { id: string; status: string } | null; error: { message: string } | null }>
      }
    }
  }

  if (typeof insertTable.insert !== 'function') {
    return {
      data: null,
      error: null,
      missingTable: false,
    }
  }

  const insertResult = insertTable.insert({
    contact_id: contactId,
    email,
    first_name: firstName,
    last_name: lastName,
    organisation,
    role,
    status: 'active',
  })
  const selectResult = insertResult.select?.('id, status')
  const singleResult = selectResult?.single
  if (typeof singleResult !== 'function') {
    return {
      data: null,
      error: null,
      missingTable: false,
    }
  }

  const { data, error } = await singleResult()

  if (!data && !error) {
    return {
      data: null,
      error: null,
      missingTable: false,
    }
  }

  if (error) {
    return {
      data: null,
      error: error.message,
      missingTable: isMissingTableMessage(error.message, 'assessment_participants'),
    }
  }

  if (!data) {
    return {
      data: null,
      error: null,
      missingTable: false,
    }
  }

  return {
    data: { id: data.id as string, status: data.status as 'active' | 'archived' },
    error: null,
    missingTable: false,
  }
}

export async function updateAssessmentParticipantStatus(input: {
  client: SupabaseClient
  participantId: string
  status: 'active' | 'archived'
}) {
  const table = input.client.from('assessment_participants') as unknown as {
    update?: (payload: Record<string, string | null>) => {
      eq: (field: string, value: string) => {
        select: (columns: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
        }
      }
    }
  }
  if (typeof table.update !== 'function') {
    return { ok: false as const, error: 'participant_table_missing' as const }
  }

  const { data, error } = await table
    .update({
      status: input.status,
      archived_at: input.status === 'archived' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.participantId)
    .select('id, status, archived_at')
    .maybeSingle()

  if (error) {
    return {
      ok: false as const,
      error: isMissingTableMessage(error.message, 'assessment_participants')
        ? 'participant_table_missing' as const
        : 'participant_update_failed' as const,
    }
  }

  if (!data) {
    return { ok: false as const, error: 'participant_not_found' as const }
  }

  return { ok: true as const, data }
}
