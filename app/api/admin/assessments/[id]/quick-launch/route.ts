import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { slugify } from '@/utils/services/admin-campaigns/shared'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await context.params
  const { adminClient } = auth

  // Load the assessment
  const { data: assessment, error: assessmentError } = await adminClient
    .from('assessments')
    .select('id, key, name, external_name, status')
    .eq('id', assessmentId)
    .maybeSingle()

  if (assessmentError || !assessment) {
    return NextResponse.json({ ok: false, error: 'assessment_not_found' }, { status: 404 })
  }

  // Build campaign defaults
  const campaignName = `${assessment.name} — Quick launch`
  const externalName = assessment.external_name || assessment.name
  let slug = slugify(`${externalName}-quick`)

  // Ensure slug uniqueness by appending a short suffix if needed
  const { data: existing } = await adminClient
    .from('campaigns')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`
  }

  // Create the campaign
  const { data: campaign, error: campaignError } = await adminClient
    .from('campaigns')
    .insert({
      name: campaignName,
      external_name: externalName,
      slug,
      status: 'active',
      config: {
        registration_position: 'none',
        report_access: 'none',
        demographics_enabled: false,
        demographics_position: 'after',
        demographics_fields: [],
        entry_limit: null,
        branding_mode: 'lq',
        branding_logo_url: null,
        branding_company_name: null,
      },
      runner_overrides: {},
    })
    .select('id, slug')
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json(
      { ok: false, error: campaignError?.message ?? 'Failed to create campaign.' },
      { status: 500 }
    )
  }

  // Create junction entry
  const { error: junctionError } = await adminClient
    .from('campaign_assessments')
    .insert({
      campaign_id: campaign.id,
      assessment_id: assessment.id,
      sort_order: 0,
      is_active: true,
    })

  if (junctionError) {
    // Clean up the campaign if junction fails
    await adminClient.from('campaigns').delete().eq('id', campaign.id)
    return NextResponse.json(
      { ok: false, error: 'Failed to attach assessment to campaign.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
  })
}
