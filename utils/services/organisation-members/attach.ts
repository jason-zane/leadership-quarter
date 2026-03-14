import type { SupabaseClient } from '@supabase/supabase-js'
import {
  findAuthUserByEmail,
  getAuthEmailsByUserId,
  isValidEmail,
  logAdminAction,
} from '@/utils/services/organisation-members/shared'
import {
  allowedRoles,
  type MembershipRow,
  type PortalRole,
} from '@/utils/services/organisation-members/types'

type MembershipLookupRow = MembershipRow & {
  organisations?: { name?: string | null } | Array<{ name?: string | null }> | null
}

function getOrganisationName(
  relation: MembershipLookupRow['organisations']
) {
  const value = Array.isArray(relation) ? relation[0] : relation
  return value?.name?.trim() || null
}

export function parseOrganisationMemberAttachPayload(
  payload: {
    email?: string
    role?: PortalRole
    userId?: string
  } | null
):
  | {
      ok: true
      data:
        | {
            role: PortalRole
            email: string
            userId: null
          }
        | {
            role: PortalRole
            email: null
            userId: string
          }
    }
  | { ok: false; error: 'invalid_payload' } {
  const email = String(payload?.email ?? '')
    .trim()
    .toLowerCase()
  const userId = String(payload?.userId ?? '').trim()
  const role = String(payload?.role ?? '') as PortalRole

  if (!allowedRoles.has(role)) {
    return { ok: false, error: 'invalid_payload' }
  }

  if (userId) {
    return {
      ok: true,
      data: {
        role,
        email: null,
        userId,
      },
    }
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: 'invalid_payload' }
  }

  return {
    ok: true,
    data: {
      role,
      email,
      userId: null,
    },
  }
}

async function resolveAttachTarget(input: {
  adminClient: SupabaseClient
  email: string | null
  userId: string | null
}) {
  if (input.userId) {
    const emailByUserId = await getAuthEmailsByUserId(input.adminClient, [input.userId])
    const resolvedEmail = emailByUserId.get(input.userId) ?? null

    if (!resolvedEmail) {
      return {
        ok: false as const,
        error: 'user_not_found' as const,
      }
    }

    return {
      ok: true as const,
      user: {
        id: input.userId,
        email: resolvedEmail,
      },
    }
  }

  const existingUser = input.email
    ? await findAuthUserByEmail(input.adminClient, input.email)
    : null

  if (!existingUser?.id) {
    return {
      ok: false as const,
      error: 'user_not_found' as const,
    }
  }

  return {
    ok: true as const,
    user: existingUser,
  }
}

export async function attachOrganisationMember(input: {
  adminClient: SupabaseClient
  actorUserId: string
  organisationId: string
  payload: {
    email?: string
    role?: PortalRole
    userId?: string
  } | null
}): Promise<
  | {
      ok: true
      data: {
        member: MembershipRow & { email: string | null }
      }
    }
  | {
      ok: false
      error:
        | 'invalid_payload'
        | 'user_not_found'
        | 'membership_lookup_failed'
        | 'membership_conflict'
        | 'membership_attach_failed'
      message?: string
    }
> {
  const parsed = parseOrganisationMemberAttachPayload(input.payload)
  if (!parsed.ok) {
    return parsed
  }

  const target = await resolveAttachTarget({
    adminClient: input.adminClient,
    email: parsed.data.email,
    userId: parsed.data.userId,
  })

  if (!target.ok) {
    return target
  }

  const { data: membershipRows, error: membershipLookupError } = await input.adminClient
    .from('organisation_memberships')
    .select(
      'id, organisation_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at, organisations(name)'
    )
    .eq('user_id', target.user.id)

  if (membershipLookupError) {
    return {
      ok: false,
      error: 'membership_lookup_failed',
      message: membershipLookupError.message,
    }
  }

  const memberships = (membershipRows ?? []) as MembershipLookupRow[]
  const conflictingMembership = memberships.find(
    (membership) =>
      membership.organisation_id !== input.organisationId &&
      (membership.status === 'active' || membership.status === 'invited')
  )

  if (conflictingMembership) {
    const organisationName = getOrganisationName(conflictingMembership.organisations)
    return {
      ok: false,
      error: 'membership_conflict',
      message: organisationName
        ? `User already has client access in ${organisationName}.`
        : 'User already has client access in another organisation.',
    }
  }

  const existingMembership =
    memberships.find((membership) => membership.organisation_id === input.organisationId) ?? null
  const now = new Date().toISOString()
  const { data, error } = await input.adminClient
    .from('organisation_memberships')
    .upsert(
      {
        organisation_id: input.organisationId,
        user_id: target.user.id,
        role: parsed.data.role,
        status: 'active',
        invited_by: input.actorUserId,
        invited_at: existingMembership?.invited_at ?? now,
        accepted_at: existingMembership?.accepted_at ?? now,
        updated_at: now,
      },
      { onConflict: 'organisation_id,user_id' }
    )
    .select(
      'id, organisation_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at'
    )
    .single()

  if (error || !data) {
    if (error?.code === '23505') {
      return {
        ok: false,
        error: 'membership_conflict',
        message: 'User already has client access in another organisation.',
      }
    }

    return {
      ok: false,
      error: 'membership_attach_failed',
      message: error?.message,
    }
  }

  await logAdminAction({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'organisation_member_attached',
    targetUserId: data.user_id,
    targetEmail: target.user.email ?? null,
    details: {
      organisation_id: input.organisationId,
      role: data.role,
      status: data.status,
      previous_status: existingMembership?.status ?? null,
      existing_membership: Boolean(existingMembership),
    },
  })

  return {
    ok: true,
    data: {
      member: {
        ...(data as MembershipRow),
        email: target.user.email ?? null,
      },
    },
  }
}
