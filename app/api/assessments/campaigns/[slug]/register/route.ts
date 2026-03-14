import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG } from '@/utils/campaign-url'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import {
  registerAssessmentCampaignParticipant,
} from '@/utils/services/assessment-campaign-entry'

function campaignErrorMessage(error: string) {
  if (error === 'campaign_limit_reached') return 'This campaign has reached its assessment limit.'
  if (error === 'campaign_not_active') return 'This campaign is no longer accepting responses.'
  if (error === 'survey_not_active') return 'The assessment for this campaign is currently unavailable.'
  return error
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const url = new URL(request.url)

  // Rate limit by IP: 20 registrations per minute per IP
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`campaign-register:${ip}`, 20, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: `/api/assessments/campaigns/${slug}/register`,
      scope: 'public',
      bucket: 'campaign-register',
      identifierType: 'ip',
      identifier: ip,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await registerAssessmentCampaignParticipant({
    organisationSlug: LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG,
    campaignSlug: slug,
    payload: (await request.json().catch(() => null)) as Parameters<
      typeof registerAssessmentCampaignParticipant
    >[0]['payload'],
    runtimeMode: url.searchParams.get('engine') === 'v2' ? 'v2' : 'default',
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' || result.error === 'invalid_fields'
        ? 400
        : result.error === 'campaign_not_found'
          ? 404
          : result.error === 'campaign_not_active' || result.error === 'campaign_limit_reached' || result.error === 'survey_not_active'
            ? 410
            : 500

    return NextResponse.json({ ok: false, error: result.error, message: campaignErrorMessage(result.error) }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
