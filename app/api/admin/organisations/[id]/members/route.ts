import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPasswordRedirectUrl } from '@/utils/auth-urls'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

type PortalRole = 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'

const allowedRoles = new Set<PortalRole>(['org_owner', 'org_admin', 'campaign_manager', 'viewer'])

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function findAuthUserByEmail(
  adminClient: SupabaseClient,
  email: string
) {
  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) return null
  return data.users.find((candidate: { email?: string | null }) => (candidate.email ?? '').toLowerCase() === email) ?? null
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
  } | null

  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase()
  const role = String(body?.role ?? '') as PortalRole

  if (!isValidEmail(email) || !allowedRoles.has(role)) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  let user = await findAuthUserByEmail(auth.adminClient, email)
  if (!user) {
    let redirectTo: string
    try {
      redirectTo = getPasswordRedirectUrl('set', 'portal')
    } catch {
      return NextResponse.json({ ok: false, error: 'site_url_not_configured' }, { status: 500 })
    }

    const { data: invited, error: inviteError } = await auth.adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

    if (inviteError) {
      return NextResponse.json({ ok: false, error: 'invite_failed', message: inviteError.message }, { status: 500 })
    }

    user = invited.user
  }

  if (!user?.id) {
    return NextResponse.json({ ok: false, error: 'user_lookup_failed' }, { status: 500 })
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
    return NextResponse.json({ ok: false, error: 'membership_upsert_failed', message: error?.message }, { status: 500 })
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
    },
  })

  return NextResponse.json({ ok: true, member: { ...data, email } }, { status: 201 })
}
