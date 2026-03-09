import { NextResponse } from 'next/server'
import { getAssessmentRuntimeCampaign } from '@/utils/services/assessment-runtime-campaign'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const result = await getAssessmentRuntimeCampaign({ slug })

  if (!result.ok) {
    const status =
      result.error === 'campaign_not_found'
        ? 404
        : result.error === 'campaign_not_active' || result.error === 'assessment_not_active'
          ? 410
          : 500

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
