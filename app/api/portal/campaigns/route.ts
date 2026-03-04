import { NextResponse } from 'next/server'
import { DEFAULT_CAMPAIGN_CONFIG, type CampaignConfig } from '@/utils/assessments/campaign-types'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toPositiveInt(input: string | null, fallback: number) {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export async function GET(request: Request) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const page = toPositiveInt(searchParams.get('page'), 1)
  const pageSize = Math.min(toPositiveInt(searchParams.get('pageSize'), 25), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await auth.adminClient
    .from('campaigns')
    .select(
      'id, organisation_id, name, slug, status, config, created_at, updated_at, campaign_assessments(id, assessment_id, sort_order, is_active)',
      { count: 'exact' }
    )
    .eq('organisation_id', auth.context.organisationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load campaigns.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    campaigns: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  })
}

export async function POST(request: Request) {
  const auth = await requirePortalApiAuth({
    allowedRoles: ['org_owner', 'org_admin', 'campaign_manager'],
  })
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as {
    name?: string
    slug?: string
    config?: Partial<CampaignConfig>
    assessment_ids?: string[]
  } | null

  const name = String(body?.name ?? '').trim()
  if (!name) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'Campaign name is required.' },
      { status: 400 }
    )
  }

  const slug = String(body?.slug ?? '').trim() || slugify(name)
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'Campaign slug format is invalid.' },
      { status: 400 }
    )
  }

  const assessmentIds = (body?.assessment_ids ?? [])
    .map((value) => String(value).trim())
    .filter(Boolean)
  if (assessmentIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'At least one assessment is required.' },
      { status: 400 }
    )
  }

  const { data: allowedRows, error: allowedError } = await auth.adminClient
    .from('organisation_assessment_access')
    .select('assessment_id')
    .eq('organisation_id', auth.context.organisationId)
    .eq('enabled', true)
    .in('assessment_id', assessmentIds)

  if (allowedError) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to validate assessment access.' },
      { status: 500 }
    )
  }

  const allowedSet = new Set((allowedRows ?? []).map((row) => row.assessment_id))
  const disallowed = assessmentIds.filter((id) => !allowedSet.has(id))
  if (disallowed.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'forbidden',
        message: 'One or more assessments are not assigned to your organisation.',
      },
      { status: 403 }
    )
  }

  const config: CampaignConfig = { ...DEFAULT_CAMPAIGN_CONFIG, ...(body?.config ?? {}) }

  const { data: campaign, error: createError } = await auth.adminClient
    .from('campaigns')
    .insert({
      organisation_id: auth.context.organisationId,
      name,
      slug,
      config,
      created_by: auth.user.id,
    })
    .select('id, organisation_id, name, slug, status, config, created_at, updated_at')
    .single()

  if (createError || !campaign) {
    if (createError?.code === '23505') {
      return NextResponse.json(
        { ok: false, error: 'conflict', message: 'Campaign slug is already in use.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to create campaign.' },
      { status: 500 }
    )
  }

  const assessmentRows = assessmentIds.map((assessmentId, idx) => ({
    campaign_id: campaign.id,
    assessment_id: assessmentId,
    sort_order: idx,
  }))

  const { error: linkError } = await auth.adminClient.from('campaign_assessments').insert(assessmentRows)
  if (linkError) {
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        message: 'Campaign created but failed to assign assessments.',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, campaign }, { status: 201 })
}
