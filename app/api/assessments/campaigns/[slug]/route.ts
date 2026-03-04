import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const { data, error } = await adminClient
    .from('campaigns')
    .select(`
      id, name, slug, status, config,
      organisations(name),
      campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name, description, status))
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'campaign_not_found' }, { status: 404 })
  }

  if (data.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'campaign_not_active' }, { status: 410 })
  }

  const orgRelation = data.organisations as unknown
  const organisation = (Array.isArray(orgRelation) ? orgRelation[0] : orgRelation) as
    | { name: string }
    | null

  type AssessmentRelation = { id: string; key: string; name: string; description: string | null; status: string } | null
  type AssessmentRow = { id: string; assessment_id: string; sort_order: number; is_active: boolean; assessments: unknown }

  const rawAssessments = (data.campaign_assessments ?? []) as AssessmentRow[]
  const assessments = rawAssessments
    .filter((a) => a.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((a) => {
      const assessmentRel = a.assessments as unknown
      const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as AssessmentRelation
      return assessment && assessment.status === 'active'
        ? {
            id: a.id,
            assessment: {
              id: assessment.id,
              key: assessment.key,
              name: assessment.name,
              description: assessment.description,
            },
            // Backward compatibility for existing clients.
            survey: {
              id: assessment.id,
              key: assessment.key,
              name: assessment.name,
              description: assessment.description,
            },
          }
        : null
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)

  if (assessments.length === 0) {
    return NextResponse.json({ ok: false, error: 'survey_not_active' }, { status: 410 })
  }

  const firstAssessment = assessments[0]?.assessment ?? null

  return NextResponse.json({
    ok: true,
    campaign: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      config: data.config as CampaignConfig,
      organisation: organisation?.name ?? null,
    },
    assessments,
    // Convenience: first active assessment.
    assessment: firstAssessment,
    // Backward compatibility alias.
    survey: assessments[0].survey,
  })
}
