import { NextResponse } from 'next/server'
import { getAssessmentCampaign } from '@/utils/services/assessment-campaign-access'

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const result = await getAssessmentCampaign({ slug })

  if (!result.ok) {
    const status =
      result.error === 'campaign_not_found'
        ? 404
        : result.error === 'campaign_not_active' || result.error === 'survey_not_active'
          ? 410
          : 500

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
