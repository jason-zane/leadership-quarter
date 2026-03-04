import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

async function logAdminAction(input: {
  adminClient: SupabaseClient
  actorUserId: string
  action: string
  details?: Record<string, string | number | boolean | null>
}) {
  await input.adminClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    details: input.details ?? {},
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; accessId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId, accessId } = await params

  const body = (await request.json().catch(() => null)) as {
    enabled?: boolean
    config_override?: Record<string, unknown>
  } | null

  if (!body || (body.enabled === undefined && body.config_override === undefined)) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.enabled !== undefined) updates.enabled = body.enabled
  if (body.config_override !== undefined) updates.config_override = body.config_override

  const { data, error } = await auth.adminClient
    .from('organisation_assessment_access')
    .update(updates)
    .eq('id', accessId)
    .eq('organisation_id', organisationId)
    .select('id, organisation_id, assessment_id, enabled, config_override, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'access_update_failed' }, { status: 500 })
  }

  await logAdminAction({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    action: 'organisation_assessment_access_updated',
    details: {
      organisation_id: organisationId,
      access_id: accessId,
      assessment_id: data.assessment_id,
      enabled: data.enabled,
    },
  })

  return NextResponse.json({ ok: true, access: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; accessId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId, accessId } = await params

  const { data: existing } = await auth.adminClient
    .from('organisation_assessment_access')
    .select('id, assessment_id, enabled')
    .eq('id', accessId)
    .eq('organisation_id', organisationId)
    .maybeSingle()

  const { error } = await auth.adminClient
    .from('organisation_assessment_access')
    .delete()
    .eq('id', accessId)
    .eq('organisation_id', organisationId)

  if (error) {
    return NextResponse.json({ ok: false, error: 'access_delete_failed' }, { status: 500 })
  }

  await logAdminAction({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    action: 'organisation_assessment_access_removed',
    details: {
      organisation_id: organisationId,
      access_id: accessId,
      assessment_id: existing?.assessment_id ?? null,
      enabled: existing?.enabled ?? null,
    },
  })

  return NextResponse.json({ ok: true })
}
