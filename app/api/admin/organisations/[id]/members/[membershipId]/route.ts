import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

type PortalRole = 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'
type MembershipStatus = 'invited' | 'active' | 'suspended'

const allowedRoles = new Set<PortalRole>(['org_owner', 'org_admin', 'campaign_manager', 'viewer'])
const allowedStatuses = new Set<MembershipStatus>(['invited', 'active', 'suspended'])

async function logAdminAction(input: {
  adminClient: SupabaseClient
  actorUserId: string
  action: string
  targetUserId?: string | null
  details?: Record<string, string | number | boolean | null>
}) {
  await input.adminClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_user_id: input.targetUserId ?? null,
    details: input.details ?? {},
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId, membershipId } = await params

  const body = (await request.json().catch(() => null)) as {
    role?: PortalRole
    status?: MembershipStatus
  } | null

  if (!body || (!body.role && !body.status)) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.role !== undefined) {
    if (!allowedRoles.has(body.role)) {
      return NextResponse.json({ ok: false, error: 'invalid_role' }, { status: 400 })
    }
    updates.role = body.role
  }

  if (body.status !== undefined) {
    if (!allowedStatuses.has(body.status)) {
      return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 })
    }
    updates.status = body.status
  }

  const { data, error } = await auth.adminClient
    .from('organisation_memberships')
    .update(updates)
    .eq('id', membershipId)
    .eq('organisation_id', organisationId)
    .select('id, organisation_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'membership_update_failed' }, { status: 500 })
  }

  await logAdminAction({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    action: 'organisation_member_updated',
    targetUserId: data.user_id,
    details: {
      organisation_id: organisationId,
      membership_id: membershipId,
      role: data.role,
      status: data.status,
    },
  })

  return NextResponse.json({ ok: true, member: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId, membershipId } = await params

  const { data: existing } = await auth.adminClient
    .from('organisation_memberships')
    .select('id, user_id, role, status')
    .eq('id', membershipId)
    .eq('organisation_id', organisationId)
    .maybeSingle()

  const { error } = await auth.adminClient
    .from('organisation_memberships')
    .delete()
    .eq('id', membershipId)
    .eq('organisation_id', organisationId)

  if (error) {
    return NextResponse.json({ ok: false, error: 'membership_delete_failed' }, { status: 500 })
  }

  await logAdminAction({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    action: 'organisation_member_removed',
    targetUserId: existing?.user_id ?? null,
    details: {
      organisation_id: organisationId,
      membership_id: membershipId,
      role: existing?.role ?? null,
      status: existing?.status ?? null,
    },
  })

  return NextResponse.json({ ok: true })
}
