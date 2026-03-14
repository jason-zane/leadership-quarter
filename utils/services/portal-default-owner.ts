import type { SupabaseClient } from '@supabase/supabase-js'
import { getPortalDefaultOwnerEmail } from '@/utils/portal-admin-access'

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message?: string }

type MembershipUpsertResult = {
  userId: string
  email: string
}

async function findAuthUserByEmail(adminClient: SupabaseClient, email: string) {
  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (error) {
    return { userId: null, error: error.message }
  }

  const user = data.users.find((candidate) => (candidate.email ?? '').toLowerCase() === email)
  return { userId: user?.id ?? null, error: null }
}

async function writeAuditLog(input: {
  adminClient: SupabaseClient
  actorUserId: string | null
  action: string
  targetUserId?: string | null
  targetEmail?: string | null
  details: Record<string, string | number | boolean | null>
}) {
  await input.adminClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_user_id: input.targetUserId ?? null,
    target_email: input.targetEmail ?? null,
    details: input.details,
  })
}

export async function ensureDefaultPortalOwnerMembership(input: {
  adminClient: SupabaseClient
  organisationId: string
  actorUserId?: string | null
}): Promise<Result<MembershipUpsertResult>> {
  const email = getPortalDefaultOwnerEmail()
  if (!email) {
    return { ok: false, error: 'default_owner_not_configured', message: 'PORTAL_DEFAULT_OWNER_EMAIL is not set.' }
  }

  const userLookup = await findAuthUserByEmail(input.adminClient, email)
  if (userLookup.error) {
    return { ok: false, error: 'default_owner_lookup_failed', message: userLookup.error }
  }

  if (!userLookup.userId) {
    return {
      ok: false,
      error: 'default_owner_not_found',
      message: `No auth user exists for ${email}.`,
    }
  }

  const now = new Date().toISOString()
  const { error } = await input.adminClient
    .from('organisation_memberships')
    .upsert(
      {
        organisation_id: input.organisationId,
        user_id: userLookup.userId,
        role: 'org_owner',
        status: 'active',
        invited_by: input.actorUserId ?? null,
        invited_at: now,
        accepted_at: now,
        updated_at: now,
      },
      { onConflict: 'organisation_id,user_id' }
    )

  if (error) {
    return { ok: false, error: 'default_owner_membership_failed', message: error.message }
  }

  await writeAuditLog({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId ?? null,
    action: 'default_portal_owner_upserted',
    targetUserId: userLookup.userId,
    targetEmail: email,
    details: {
      organisation_id: input.organisationId,
      role: 'org_owner',
      status: 'active',
    },
  })

  return {
    ok: true,
    data: {
      userId: userLookup.userId,
      email,
    },
  }
}

export async function backfillDefaultPortalOwnerMemberships(input: {
  adminClient: SupabaseClient
  actorUserId: string
}): Promise<Result<{ organisationCount: number; ownerEmail: string }>> {
  const email = getPortalDefaultOwnerEmail()
  if (!email) {
    return { ok: false, error: 'default_owner_not_configured', message: 'PORTAL_DEFAULT_OWNER_EMAIL is not set.' }
  }

  const { data: organisations, error } = await input.adminClient
    .from('organisations')
    .select('id')
    .eq('status', 'active')

  if (error) {
    return { ok: false, error: 'organisations_load_failed', message: error.message }
  }

  for (const organisation of organisations ?? []) {
    const result = await ensureDefaultPortalOwnerMembership({
      adminClient: input.adminClient,
      organisationId: organisation.id,
      actorUserId: input.actorUserId,
    })
    if (!result.ok) {
      return result
    }
  }

  await writeAuditLog({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'default_portal_owner_backfill_completed',
    targetEmail: email,
    details: {
      organisation_count: organisations?.length ?? 0,
    },
  })

  return {
    ok: true,
    data: {
      organisationCount: organisations?.length ?? 0,
      ownerEmail: email,
    },
  }
}
