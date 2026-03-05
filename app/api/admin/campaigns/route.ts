import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { DEFAULT_CAMPAIGN_CONFIG, type CampaignConfig } from '@/utils/assessments/campaign-types'

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET() {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .select(`
      id, organisation_id, name, slug, status, config, runner_overrides, created_at,
      organisations(id, name, slug),
      campaign_assessments(id, assessment_id, sort_order, is_active)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'campaigns_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, campaigns: data ?? [] })
}

export async function POST(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as {
    name?: string
    slug?: string
    organisation_id?: string | null
    config?: Partial<CampaignConfig>
    runner_overrides?: Record<string, unknown>
    assessment_ids?: string[]
    // legacy alias
    survey_ids?: string[]
  } | null

  const name = String(body?.name ?? '').trim()
  if (!name) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
  }

  const slug = String(body?.slug ?? '').trim() || slugify(name)
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid_slug' }, { status: 400 })
  }

  const config: CampaignConfig = { ...DEFAULT_CAMPAIGN_CONFIG, ...(body?.config ?? {}) }

  const { data: campaign, error: campaignError } = await auth.adminClient
    .from('campaigns')
    .insert({
      organisation_id: body?.organisation_id ?? null,
      name,
      slug,
      config,
      runner_overrides: body?.runner_overrides ?? {},
      created_by: auth.user.id,
    })
    .select('id, organisation_id, name, slug, status, config, created_at')
    .single()

  if (campaignError) {
    if (campaignError.code === '23505') {
      return NextResponse.json({ ok: false, error: 'slug_taken' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'create_failed' }, { status: 500 })
  }

  // Insert initial assessments if provided (accept both assessment_ids and survey_ids for compat)
  const assessmentIds = body?.assessment_ids ?? body?.survey_ids ?? []
  if (assessmentIds.length > 0) {
    const assessmentRows = assessmentIds.map((aid, idx) => ({
      campaign_id: campaign.id,
      assessment_id: aid,
      sort_order: idx,
    }))
    await auth.adminClient.from('campaign_assessments').insert(assessmentRows)
  }

  return NextResponse.json({ ok: true, campaign }, { status: 201 })
}
