import {
  campaignSubmitErrorResponse,
  checkCampaignRateLimit,
} from '@/utils/api/campaign-route-helpers'
import { submitAssessmentCampaign } from '@/utils/services/assessment-campaign-entry'

export const maxDuration = 30

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; campaignSlug: string }> }
) {
  const t0 = Date.now()
  const traceId = request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id') ?? undefined
  const { slug: organisationSlug, campaignSlug } = await params
  const route = `/api/assessments/campaigns/${organisationSlug}/${campaignSlug}/submit`

  const { rateLimitedResponse } = await checkCampaignRateLimit(request, route, 'campaign-submit')
  if (rateLimitedResponse) return rateLimitedResponse

  const result = await submitAssessmentCampaign({
    organisationSlug,
    campaignSlug,
    payload: await request.json().catch(() => null),
  })

  return campaignSubmitErrorResponse(result, route, t0, traceId)
}
