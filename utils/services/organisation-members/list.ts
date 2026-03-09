import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthEmailsByUserId } from '@/utils/services/organisation-members/shared'
import type { MembershipRow } from '@/utils/services/organisation-members/types'

export async function listOrganisationMembers(input: {
  adminClient: SupabaseClient
  organisationId: string
}): Promise<
  | {
      ok: true
      data: {
        members: Array<MembershipRow & { email: string | null }>
      }
    }
  | { ok: false; error: 'members_list_failed' }
> {
  const { data, error } = await input.adminClient
    .from('organisation_memberships')
    .select(
      'id, organisation_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at'
    )
    .eq('organisation_id', input.organisationId)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, error: 'members_list_failed' }
  }

  const rows = (data ?? []) as MembershipRow[]
  const emailByUserId = await getAuthEmailsByUserId(
    input.adminClient,
    rows.map((row) => row.user_id)
  )

  return {
    ok: true,
    data: {
      members: rows.map((row) => ({
        ...row,
        email: emailByUserId.get(row.user_id) ?? null,
      })),
    },
  }
}
