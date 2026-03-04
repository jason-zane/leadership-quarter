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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params

  const { data, error } = await auth.adminClient
    .from('organisation_assessment_access')
    .select('id, organisation_id, assessment_id, enabled, config_override, created_at, updated_at, assessments(id, key, name, status)')
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'access_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, access: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params

  const body = (await request.json().catch(() => null)) as {
    assessment_id?: string
    enabled?: boolean
    config_override?: Record<string, unknown>
  } | null

  const assessmentId = String(body?.assessment_id ?? '').trim()
  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: 'assessment_id_required' }, { status: 400 })
  }

  const { data, error } = await auth.adminClient
    .from('organisation_assessment_access')
    .upsert(
      {
        organisation_id: organisationId,
        assessment_id: assessmentId,
        enabled: body?.enabled ?? true,
        config_override: body?.config_override ?? {},
        created_by: auth.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organisation_id,assessment_id' }
    )
    .select('id, organisation_id, assessment_id, enabled, config_override, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'access_upsert_failed', message: error?.message }, { status: 500 })
  }

  await logAdminAction({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    action: 'organisation_assessment_access_granted',
    details: {
      organisation_id: organisationId,
      access_id: data.id,
      assessment_id: data.assessment_id,
      enabled: data.enabled,
    },
  })

  return NextResponse.json({ ok: true, access: data }, { status: 201 })
}
