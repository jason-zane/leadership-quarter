import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPasswordRedirectUrl } from '@/utils/auth-urls'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

type PortalRole = 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'
type InviteMode = 'auto' | 'email' | 'manual_link'
type DeliveryMode = 'email' | 'manual_link' | 'auto_fallback'

const allowedRoles = new Set<PortalRole>(['org_owner', 'org_admin', 'campaign_manager', 'viewer'])
const allowedInviteModes = new Set<InviteMode>(['auto', 'email', 'manual_link'])

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function randomPassword() {
  return `LQ!${crypto.randomUUID()}`
}

function shouldFallbackToManualLink(message: string) {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('rate limit') ||
    normalized.includes('too many') ||
    normalized.includes('smtp') ||
    normalized.includes('email provider') ||
    normalized.includes('email rate limit exceeded')
  )
}

async function findAuthUserByEmail(adminClient: SupabaseClient, email: string) {
  const perPage = 200
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) return null
    const found =
      data.users.find(
        (candidate: { email?: string | null }) => (candidate.email ?? '').toLowerCase() === email
      ) ?? null
    if (found) return found
    if (data.users.length < perPage) break
  }
  return null
}

async function ensureAuthUser(adminClient: SupabaseClient, email: string) {
  const existingUser = await findAuthUserByEmail(adminClient, email)
  if (existingUser) {
    return { user: existingUser, error: null as string | null }
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: randomPassword(),
    email_confirm: true,
  })

  if (error || !data.user) {
    return { user: null, error: error?.message ?? 'Failed to create auth user.' }
  }

  return { user: data.user, error: null as string | null }
}

async function generateSetupLink(adminClient: SupabaseClient, email: string) {
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

  return { setupLink: data.properties.action_link, error: null, message: null } as const
}

async function logAdminAction(input: {
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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params

  const { data, error } = await auth.adminClient
    .from('organisation_memberships')
    .select('id, organisation_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'members_list_failed' }, { status: 500 })
  }

  const userIds = (data ?? []).map((row) => row.user_id)
  const emailByUserId = new Map<string, string | null>()

  if (userIds.length > 0) {
    const { data: usersResult, error: usersError } = await auth.adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (!usersError) {
      for (const user of usersResult.users) {
        if (userIds.includes(user.id)) {
          emailByUserId.set(user.id, user.email ?? null)
        }
      }
    }
  }

  const members = (data ?? []).map((row) => ({
    ...row,
    email: emailByUserId.get(row.user_id) ?? null,
  }))

  return NextResponse.json({ ok: true, members })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params

  const body = (await request.json().catch(() => null)) as {
    email?: string
    role?: PortalRole
    mode?: InviteMode
  } | null

  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase()
  const role = String(body?.role ?? '') as PortalRole
  const mode = (String(body?.mode ?? 'auto').trim() || 'auto') as InviteMode

  if (!isValidEmail(email) || !allowedRoles.has(role) || !allowedInviteModes.has(mode)) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  let user = await findAuthUserByEmail(auth.adminClient, email)
  let delivery: DeliveryMode = 'email'
  let setupLink: string | null = null
  let warning: string | null = null

  const shouldAttemptEmail = mode === 'auto' || mode === 'email'
  if (!user && shouldAttemptEmail) {
    let redirectTo: string
    try {
      redirectTo = getPasswordRedirectUrl('set', 'portal')
    } catch {
      return NextResponse.json({ ok: false, error: 'site_url_not_configured' }, { status: 500 })
    }

    let { data: invited, error: inviteError } = await auth.adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (inviteError?.message.toLowerCase().includes('redirect')) {
      const adminRedirect = getPasswordRedirectUrl('set', 'admin')
      const retry = await auth.adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: adminRedirect,
      })
      invited = retry.data
      inviteError = retry.error
    }

    if (!inviteError) {
      user = invited.user
    } else if (mode === 'email' || !shouldFallbackToManualLink(inviteError.message)) {
      const message = inviteError.message.toLowerCase()
      const errorCode = message.includes('redirect')
        ? 'invite_redirect_not_allowed'
        : message.includes('smtp') || message.includes('email')
          ? 'invite_email_provider_failed'
          : message.includes('already') || message.includes('registered') || message.includes('exists')
            ? 'invite_user_already_exists'
            : 'invite_failed'
      return NextResponse.json({ ok: false, error: errorCode, message: inviteError.message }, { status: 500 })
    } else {
      delivery = 'auto_fallback'
      warning = `Email invite failed (${inviteError.message}). Generated manual setup link instead.`
    }
  }

  const useManualLink = mode === 'manual_link' || delivery === 'auto_fallback' || !user
  if (useManualLink) {
    const ensured = await ensureAuthUser(auth.adminClient, email)
    if (ensured.error || !ensured.user) {
      return NextResponse.json(
        { ok: false, error: 'user_create_failed', message: ensured.error ?? 'Failed to create auth user.' },
        { status: 500 }
      )
    }
    user = ensured.user

    const linkResult = await generateSetupLink(auth.adminClient, email)
    if (linkResult.error || !linkResult.setupLink) {
      return NextResponse.json(
        { ok: false, error: linkResult.error ?? 'setup_link_generation_failed', message: linkResult.message },
        { status: 500 }
      )
    }
    setupLink = linkResult.setupLink
    if (mode === 'manual_link') {
      delivery = 'manual_link'
    }
  }

  if (!user?.id) {
    return NextResponse.json(
      { ok: false, error: 'user_lookup_failed', message: 'Auth user is missing.' },
      { status: 500 }
    )
  }

  const now = new Date().toISOString()

  const { data, error } = await auth.adminClient
    .from('organisation_memberships')
    .upsert(
      {
        organisation_id: organisationId,
        user_id: user.id,
        role,
        status: 'invited',
        invited_by: auth.user.id,
        invited_at: now,
        updated_at: now,
      },
      { onConflict: 'organisation_id,user_id' }
    )
    .select('id, organisation_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: 'membership_upsert_failed', message: error?.message },
      { status: 500 }
    )
  }

  await logAdminAction({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    action: 'organisation_member_invited',
    targetUserId: data.user_id,
    targetEmail: email,
    details: {
      organisation_id: organisationId,
      role,
      status: 'invited',
      delivery,
      fallback: delivery === 'auto_fallback',
      has_setup_link: Boolean(setupLink),
    },
  })

  return NextResponse.json(
    {
      ok: true,
      member: { ...data, email },
      delivery,
      setup_link: setupLink ?? undefined,
      warning: warning ?? undefined,
    },
    { status: 201 }
  )
}
