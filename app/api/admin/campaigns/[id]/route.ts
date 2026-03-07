import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { DEFAULT_CAMPAIGN_CONFIG, type CampaignConfig, type CampaignStatus } from '@/utils/assessments/campaign-types'

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .select(`
      id, organisation_id, name, slug, status, config, created_at, updated_at,
      runner_overrides,
      organisations(id, name, slug),
      campaign_assessments(id, assessment_id, sort_order, is_active, created_at, assessments(id, key, name, description, status, runner_config))
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
    slug?: string
    status?: CampaignStatus
    organisation_id?: string | null
    config?: Partial<CampaignConfig>
    runner_overrides?: Record<string, unknown>
  } | null

  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = String(body.name).trim()
  if (body.slug !== undefined) {
    const slug = normalizeSlug(body.slug)
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
      return NextResponse.json({ ok: false, error: 'invalid_slug' }, { status: 400 })
    }
    updates.slug = slug
  }
  if (body.status !== undefined) updates.status = body.status
  if (body.organisation_id !== undefined) updates.organisation_id = body.organisation_id
  if (body.config !== undefined) {
    // Fetch current config to merge
    const { data: existing } = await auth.adminClient
      .from('campaigns')
      .select('config')
      .eq('id', id)
      .maybeSingle()
    const mergedConfig = {
      ...DEFAULT_CAMPAIGN_CONFIG,
      ...((existing?.config as CampaignConfig) ?? {}),
      ...body.config,
    } as CampaignConfig
    if (!mergedConfig.demographics_enabled) {
      mergedConfig.demographics_fields = []
    }
    updates.config = mergedConfig
  }
  if (body.runner_overrides !== undefined) updates.runner_overrides = body.runner_overrides

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .select('id, organisation_id, name, slug, status, config, runner_overrides, updated_at')
    .maybeSingle()

  if (error || !data) {
    if (error?.code === '23505') {
      return NextResponse.json({ ok: false, error: 'slug_taken' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, campaign: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const { error } = await auth.adminClient
    .from('campaigns')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
