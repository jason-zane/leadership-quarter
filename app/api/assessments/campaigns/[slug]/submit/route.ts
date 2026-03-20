import { LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG } from '@/utils/campaign-url'
import {
  campaignSubmitErrorResponse,
  checkCampaignRateLimit,
} from '@/utils/api/campaign-route-helpers'
import { submitAssessmentCampaign } from '@/utils/services/assessment-campaign-entry'

export const maxDuration = 30

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t0 = Date.now()
  const traceId = request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id') ?? undefined
  const { slug } = await params
  const route = `/api/assessments/campaigns/${slug}/submit`

  const { rateLimitedResponse } = await checkCampaignRateLimit(request, route, 'campaign-submit')
  if (rateLimitedResponse) return rateLimitedResponse

  const result = await submitAssessmentCampaign({
    organisationSlug: LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG,
    campaignSlug: slug,
    payload: await request.json().catch(() => null),
  })

  return campaignSubmitErrorResponse(result, route, t0, traceId)
}
