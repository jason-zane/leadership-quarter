import { sanitiseSearchQuery } from '@/utils/sanitise-search-query'
import { normalizeText } from '@/utils/services/participant-identity'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  InvitationRow,
  ParticipantFilters,
  ParticipantRecordRow,
  SubmissionRow,
} from './types'

export async function loadParticipantSourceRows(input: {
  adminClient: SupabaseClient
  filters?: ParticipantFilters
}) {
  const query = normalizeText(input.filters?.q).toLowerCase()
  const assessmentId = normalizeText(input.filters?.assessmentId) || null
  const campaignId = normalizeText(input.filters?.campaignId) || null

  let submissionsQuery = input.adminClient
    .from('assessment_submissions')
    .select(`
      id, assessment_id, campaign_id, invitation_id, participant_id, contact_id, first_name, last_name, email, organisation, role, demographics, created_at,
      assessments(id, key, name:external_name, report_config),
      campaigns(id, name:external_name, slug),
      assessment_invitations!survey_submissions_invitation_id_fkey(id, contact_id, status, completed_at, first_name, last_name, email, organisation, role)
    `)
    .eq('is_preview_sample', false)
    .order('created_at', { ascending: false })

  let invitationsQuery = input.adminClient
    .from('assessment_invitations')
    .select(`
      id, assessment_id, campaign_id, participant_id, contact_id, first_name, last_name, email, organisation, role, status, completed_at, created_at, expires_at,
      assessments(id, key, name:external_name),
      campaigns(id, name:external_name, slug)
    `)
    .order('created_at', { ascending: false })

  if (assessmentId) {
    submissionsQuery = submissionsQuery.eq('assessment_id', assessmentId)
    invitationsQuery = invitationsQuery.eq('assessment_id', assessmentId)
  }
  if (campaignId) {
    submissionsQuery = submissionsQuery.eq('campaign_id', campaignId)
    invitationsQuery = invitationsQuery.eq('campaign_id', campaignId)
  }
  if (query) {
    const sq = sanitiseSearchQuery(query)
    if (sq) {
      const orClause = `email.ilike.%${sq}%,first_name.ilike.%${sq}%,last_name.ilike.%${sq}%,organisation.ilike.%${sq}%,role.ilike.%${sq}%`
      submissionsQuery = submissionsQuery.or(orClause)
      invitationsQuery = invitationsQuery.or(orClause)
    }
  }

  const [{ data: submissionRows, error: submissionsError }, { data: invitationRows, error: invitationsError }] = await Promise.all([
    submissionsQuery,
    invitationsQuery,
  ])

  if (submissionsError || invitationsError) {
    return { ok: false as const, error: 'participants_list_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      submissions: (submissionRows ?? []) as SubmissionRow[],
      invitations: (invitationRows ?? []) as InvitationRow[],
    },
  }
}

export async function loadParticipantRecords(input: {
  adminClient: SupabaseClient
  participantIds: string[]
}) {
  const ids = [...new Set(input.participantIds.filter(Boolean))]
  if (ids.length === 0) {
    return new Map<string, ParticipantRecordRow>()
  }

  const table = input.adminClient.from('assessment_participants') as unknown as {
    select?: (columns: string) => {
      in: (field: string, values: string[]) => Promise<{ data: unknown; error: { message: string } | null }>
    }
  }
  if (typeof table.select !== 'function') {
    return new Map<string, ParticipantRecordRow>()
  }

  const { data, error } = await table
    .select('id, status, contact_id, email, first_name, last_name, organisation, role')
    .in('id', ids)

  if (error) {
    return new Map<string, ParticipantRecordRow>()
  }

  return new Map(((data ?? []) as ParticipantRecordRow[]).map((row) => [row.id, row]))
}

export async function loadLinkedContact(input: {
  adminClient: SupabaseClient
  contactId: string | null
  email: string
}) {
  if (input.contactId) {
    const { data } = await input.adminClient
      .from('contacts')
      .select('id, first_name, last_name, email, status')
      .eq('id', input.contactId)
      .maybeSingle()

    if (data) return data as { id: string; first_name: string; last_name: string; email: string; status: string }
  }

  const normalizedEmail = (input.email ?? '').toLowerCase().trim()
  if (!normalizedEmail) return null

  const { data } = await input.adminClient
    .from('contacts')
    .select('id, first_name, last_name, email, status')
    .eq('email_normalized', normalizedEmail)
    .maybeSingle()

  return (data as { id: string; first_name: string; last_name: string; email: string; status: string } | null) ?? null
}
