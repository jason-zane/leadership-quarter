import { NextResponse } from 'next/server'
import type { CampaignConfig, CampaignStatus } from '@/utils/assessments/campaign-types'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

const allowedStatusTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['active', 'archived'],
  active: ['closed', 'archived'],
  closed: ['archived'],
  archived: [],
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .select(
      'id, organisation_id, name, slug, status, config, created_at, updated_at, campaign_assessments(id, assessment_id, sort_order, is_active, created_at, assessments(id, key, name, status))'
    )
    .eq('id', id)
    .eq('organisation_id', auth.context.organisationId)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Campaign was not found.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, campaign: data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth({
    allowedRoles: ['org_owner', 'org_admin', 'campaign_manager'],
  })
  if (!auth.ok) return auth.response

  const { id } = await params

  const body = (await request.json().catch(() => null)) as {
    name?: string
    status?: CampaignStatus
    config?: Partial<CampaignConfig>
  } | null

  if (!body) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'Invalid payload.' },
      { status: 400 }
    )
  }

  const { data: existing, error: existingError } = await auth.adminClient
    .from('campaigns')
    .select('status, config')
    .eq('id', id)
    .eq('organisation_id', auth.context.organisationId)
    .maybeSingle()

  if (existingError || !existing) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Campaign was not found.' },
      { status: 404 }
    )
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'validation_error', message: 'Campaign name cannot be empty.' },
        { status: 400 }
      )
    }
    updates.name = name
  }

  if (body.status !== undefined) {
    const currentStatus = existing.status as CampaignStatus
    const nextStatus = body.status
    if (!allowedStatusTransitions[currentStatus]?.includes(nextStatus)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'validation_error',
          message: `Cannot transition campaign from ${currentStatus} to ${nextStatus}.`,
        },
        { status: 400 }
      )
    }
    updates.status = nextStatus
  }

  if (body.config !== undefined) {
    updates.config = { ...((existing.config as CampaignConfig | null) ?? {}), ...body.config }
  }

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .eq('organisation_id', auth.context.organisationId)
    .select('id, organisation_id, name, slug, status, config, updated_at')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to update campaign.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, campaign: data })
}
