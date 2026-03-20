import { LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG } from '@/utils/campaign-url'
import {
  campaignRegisterErrorResponse,
  checkCampaignRateLimit,
} from '@/utils/api/campaign-route-helpers'
import { registerAssessmentCampaignParticipant } from '@/utils/services/assessment-campaign-entry'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const route = `/api/assessments/campaigns/${slug}/register`

  const { rateLimitedResponse } = await checkCampaignRateLimit(request, route, 'campaign-register')
  if (rateLimitedResponse) return rateLimitedResponse

  const result = await registerAssessmentCampaignParticipant({
    organisationSlug: LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG,
    campaignSlug: slug,
    payload: (await request.json().catch(() => null)) as Parameters<
      typeof registerAssessmentCampaignParticipant
    >[0]['payload'],
  })

  return campaignRegisterErrorResponse(result)
}
