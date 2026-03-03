import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import type { CampaignConfig } from '@/utils/surveys/campaign-types'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const { data, error } = await adminClient
    .from('campaigns')
    .select('id, name, slug, status, config, organisations(name), surveys(id, key, name, description, status)')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'campaign_not_found' }, { status: 404 })
  }

  if (data.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'campaign_not_active' }, { status: 410 })
  }

  const surveyRelation = data.surveys as unknown
  const survey = (Array.isArray(surveyRelation) ? surveyRelation[0] : surveyRelation) as
    | { id: string; key: string; name: string; description: string | null; status: string }
    | null

  if (!survey || survey.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'survey_not_active' }, { status: 410 })
  }

  const orgRelation = data.organisations as unknown
  const organisation = (Array.isArray(orgRelation) ? orgRelation[0] : orgRelation) as
    | { name: string }
    | null

  return NextResponse.json({
    ok: true,
    campaign: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      config: data.config as CampaignConfig,
      organisation: organisation?.name ?? null,
    },
    survey: {
      id: survey.id,
      key: survey.key,
      name: survey.name,
      description: survey.description,
    },
  })
}
