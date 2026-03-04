import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import type { CampaignConfig, CampaignStatus } from '@/utils/assessments/campaign-types'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .select(`
      id, organisation_id, name, slug, status, config, created_at, updated_at,
      organisations(id, name, slug),
      campaign_assessments(id, assessment_id, sort_order, is_active, created_at, assessments(id, key, name, status))
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'campaign_not_found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, campaign: data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const body = (await request.json().catch(() => null)) as {
    name?: string
    status?: CampaignStatus
    organisation_id?: string | null
    config?: Partial<CampaignConfig>
  } | null

  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = String(body.name).trim()
  if (body.status !== undefined) updates.status = body.status
  if (body.organisation_id !== undefined) updates.organisation_id = body.organisation_id
  if (body.config !== undefined) {
    // Fetch current config to merge
    const { data: existing } = await auth.adminClient
      .from('campaigns')
      .select('config')
      .eq('id', id)
      .maybeSingle()
    updates.config = { ...(existing?.config as CampaignConfig ?? {}), ...body.config }
  }

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .select('id, organisation_id, name, slug, status, config, updated_at')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, campaign: data })
}
