import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'
import { DEFAULT_CAMPAIGN_CONFIG, type CampaignConfig } from '@/utils/surveys/campaign-types'

function slugify(text: string) {
  return text
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
    .select('id, survey_id, organisation_id, name, slug, status, config, created_at, organisations(id, name, slug)')
    .eq('survey_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'campaigns_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, campaigns: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: surveyId } = await params

  const body = (await request.json().catch(() => null)) as {
    name?: string
    slug?: string
    organisation_id?: string | null
    config?: Partial<CampaignConfig>
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

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .insert({
      survey_id: surveyId,
      organisation_id: body?.organisation_id ?? null,
      name,
      slug,
      config,
      created_by: auth.user.id,
    })
    .select('id, survey_id, organisation_id, name, slug, status, config, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: false, error: 'slug_taken' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'create_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, campaign: data }, { status: 201 })
}
