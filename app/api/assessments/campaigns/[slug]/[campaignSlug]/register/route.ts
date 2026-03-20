import {
  campaignRegisterErrorResponse,
  checkCampaignRateLimit,
} from '@/utils/api/campaign-route-helpers'
import { registerAssessmentCampaignParticipant } from '@/utils/services/assessment-campaign-entry'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; campaignSlug: string }> }
) {
  const { slug: organisationSlug, campaignSlug } = await params
  const route = `/api/assessments/campaigns/${organisationSlug}/${campaignSlug}/register`

  const { rateLimitedResponse } = await checkCampaignRateLimit(request, route, 'campaign-register')
  if (rateLimitedResponse) return rateLimitedResponse

  const result = await registerAssessmentCampaignParticipant({
    organisationSlug,
    campaignSlug,
    payload: (await request.json().catch(() => null)) as Parameters<
      typeof registerAssessmentCampaignParticipant
    >[0]['payload'],
  })

  return campaignRegisterErrorResponse(result)
}
