import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeReportConfig, resolveCampaignRunnerConfig } from '@/utils/assessments/experience-config'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const { slug } = await params

  const { data: campaign, error: campaignError } = await adminClient
    .from('campaigns')
    .select(`
      id, name, slug, status, config, runner_overrides,
      organisations(name),
      campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name, description, status, version, runner_config, report_config))
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (campaignError || !campaign) {
    return NextResponse.json({ ok: false, error: 'campaign_not_found' }, { status: 404 })
  }

  if (campaign.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'campaign_not_active' }, { status: 410 })
  }

  const active = (campaign.campaign_assessments ?? [])
    .filter((row: { is_active?: boolean }) => row.is_active)
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)[0]

  const assessmentRel = active?.assessments as unknown
  const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as
    | {
        id: string
        key: string
        name: string
        description: string | null
        status: string
        version: number
        runner_config: unknown
        report_config: unknown
      }
    | null

  if (!assessment || assessment.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'assessment_not_active' }, { status: 410 })
  }

  const { data: questions, error: questionError } = await adminClient
    .from('assessment_questions')
    .select('id, question_key, text, dimension, is_reverse_coded, sort_order')
    .eq('assessment_id', assessment.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (questionError) {
    return NextResponse.json({ ok: false, error: 'questions_load_failed' }, { status: 500 })
  }

  const orgRel = campaign.organisations as unknown
  const organisation = (Array.isArray(orgRel) ? orgRel[0] : orgRel) as { name: string } | null

  return NextResponse.json({
    ok: true,
    context: 'campaign',
    campaign: {
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      organisation: organisation?.name ?? null,
      config: campaign.config as CampaignConfig,
    },
    assessment: {
      id: assessment.id,
      key: assessment.key,
      name: assessment.name,
      description: assessment.description,
      version: assessment.version,
    },
    questions: questions ?? [],
    runnerConfig: resolveCampaignRunnerConfig(
      assessment.runner_config,
      campaign.runner_overrides,
      {
        campaignName: campaign.name,
        organisationName: organisation?.name ?? null,
        assessmentName: assessment.name,
      }
    ),
    reportConfig: normalizeReportConfig(assessment.report_config),
  })
}
