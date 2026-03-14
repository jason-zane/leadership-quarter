import type { SupabaseClient } from '@supabase/supabase-js'
import { getPasswordRedirectUrl } from '@/utils/auth-urls'

type AuthUser = {
  id: string
  email?: string | null
}

type InternalProfile = {
  role: 'admin' | 'staff'
  portalAdminAccess: boolean
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function randomPassword() {
  return `LQ!${crypto.randomUUID()}`
}

export function shouldFallbackToManualLink(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('rate limit') ||
    normalized.includes('too many') ||
    normalized.includes('smtp') ||
    normalized.includes('email provider') ||
    normalized.includes('email rate limit exceeded')
  )
}

export async function logAdminAction(input: {
  adminClient: SupabaseClient
  actorUserId: string
  action: string
  targetUserId?: string | null
  targetEmail?: string | null
  details?: Record<string, string | number | boolean | null>
}) {
  await input.adminClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_user_id: input.targetUserId ?? null,
    target_email: input.targetEmail ?? null,
    details: input.details ?? {},
  })
}

export async function findAuthUserByEmail(
  adminClient: SupabaseClient,
  email: string
): Promise<AuthUser | null> {
  const perPage = 200

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) return null

    const found =
      data.users.find(
        (candidate: { email?: string | null }) =>
          (candidate.email ?? '').toLowerCase() === email
      ) ?? null

    if (found?.id) {
      return {
        id: found.id,
        email: found.email ?? null,
      }
    }

    if (data.users.length < perPage) break
  }

  return null
}

export async function ensureAuthUser(adminClient: SupabaseClient, email: string) {
  const existingUser = await findAuthUserByEmail(adminClient, email)
  if (existingUser) {
    return { user: existingUser, error: null as string | null }
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
  })

  if (error || !data.user?.id) {
    return { user: null, error: error?.message ?? 'Failed to create auth user.' }
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
    error: null as string | null,
  }
}

export async function generateSetupLink(adminClient: SupabaseClient, email: string) {
  let redirectTo: string

  try {
    redirectTo = getPasswordRedirectUrl('set', 'portal')
  } catch {
    return {
      setupLink: null,
      error: 'site_url_not_configured',
      message: 'Portal base URL is not configured.',
    } as const
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error || !data.properties?.action_link) {
    return {
      setupLink: null,
      error: 'setup_link_generation_failed',
      message: error?.message ?? 'Failed to generate setup link.',
    } as const
  }

  return {
    setupLink: data.properties.action_link,
    error: null,
    message: null,
  } as const
}

export async function getAuthEmailsByUserId(
  adminClient: SupabaseClient,
  userIds: string[]
) {
  const emailByUserId = new Map<string, string | null>()
  if (userIds.length === 0) return emailByUserId

  const remaining = new Set(userIds)
  const perPage = 200

  for (let page = 1; page <= 20 && remaining.size > 0; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) break

    for (const user of data.users) {
      if (!remaining.has(user.id)) continue
      emailByUserId.set(user.id, user.email ?? null)
      remaining.delete(user.id)
    }

    if (data.users.length < perPage) break
  }

  return emailByUserId
}

export async function getInternalProfilesByUserId(
  adminClient: SupabaseClient,
  userIds: string[]
) {
  const profileByUserId = new Map<string, InternalProfile>()
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))

  if (uniqueUserIds.length === 0) {
    return profileByUserId
  }

  const { data, error } = await adminClient
    .from('profiles')
    .select('user_id, role, portal_admin_access')
    .in('user_id', uniqueUserIds)

  if (error) {
    return profileByUserId
  }

  for (const row of (data ?? []) as Array<{
    user_id: string
    role: 'admin' | 'staff' | null
    portal_admin_access?: boolean | null
  }>) {
    if (!row.user_id || (row.role !== 'admin' && row.role !== 'staff')) {
      continue
    }

    profileByUserId.set(row.user_id, {
      role: row.role,
      portalAdminAccess: row.portal_admin_access === true,
    })
  }

  return profileByUserId
}
