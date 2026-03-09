import type { SupabaseClient } from '@supabase/supabase-js'
import { logAdminAction } from '@/utils/services/organisation-members/shared'
import {
  allowedRoles,
  allowedStatuses,
  type MembershipRow,
  type MembershipStatus,
  type PortalRole,
} from '@/utils/services/organisation-members/types'

export async function updateOrganisationMember(input: {
  adminClient: SupabaseClient
  actorUserId: string
  organisationId: string
  membershipId: string
  payload: {
    role?: PortalRole
    status?: MembershipStatus
  } | null
}): Promise<
  | {
      ok: true
      data: {
        member: MembershipRow
      }
    }
  | {
      ok: false
      error: 'invalid_payload' | 'invalid_role' | 'invalid_status' | 'membership_update_failed'
    }
> {
  if (!input.payload || (!input.payload.role && !input.payload.status)) {
    return { ok: false, error: 'invalid_payload' }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (input.payload.role !== undefined) {
    if (!allowedRoles.has(input.payload.role)) {
      return { ok: false, error: 'invalid_role' }
    }
    updates.role = input.payload.role
  }

  if (input.payload.status !== undefined) {
    if (!allowedStatuses.has(input.payload.status)) {
      return { ok: false, error: 'invalid_status' }
    }
    updates.status = input.payload.status
  }

  const { data, error } = await input.adminClient
    .from('organisation_memberships')
    .update(updates)
    .eq('id', input.membershipId)
    .eq('organisation_id', input.organisationId)
    .select(
      'id, organisation_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at'
    )
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: 'membership_update_failed' }
  }

  await logAdminAction({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'organisation_member_updated',
    targetUserId: data.user_id,
    details: {
      organisation_id: input.organisationId,
      membership_id: input.membershipId,
      role: data.role,
      status: data.status,
    },
  })

  return {
    ok: true,
    data: {
      member: data as MembershipRow,
    },
  }
}

export async function deleteOrganisationMember(input: {
  adminClient: SupabaseClient
  actorUserId: string
  organisationId: string
  membershipId: string
}): Promise<
  | { ok: true }
  | {
      ok: false
      error: 'membership_delete_failed'
    }
> {
  const { data: existing } = await input.adminClient
    .from('organisation_memberships')
    .select('id, user_id, role, status')
    .eq('id', input.membershipId)
    .eq('organisation_id', input.organisationId)
    .maybeSingle()

  const { error } = await input.adminClient
    .from('organisation_memberships')
    .delete()
    .eq('id', input.membershipId)
    .eq('organisation_id', input.organisationId)

  if (error) {
    return { ok: false, error: 'membership_delete_failed' }
  }

  await logAdminAction({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'organisation_member_removed',
    targetUserId: existing?.user_id ?? null,
    details: {
      organisation_id: input.organisationId,
      membership_id: input.membershipId,
      role: existing?.role ?? null,
      status: existing?.status ?? null,
    },
  })

  return { ok: true }
}
