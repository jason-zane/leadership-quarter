import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { logRequest } from '@/utils/logger'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { submitAssessmentCampaign } from '@/utils/services/assessment-campaign-entry'

export const maxDuration = 30

function campaignErrorMessage(error: string) {
  if (error === 'campaign_limit_reached') return 'This campaign has reached its assessment limit.'
  if (error === 'campaign_not_active') return 'This campaign is no longer accepting responses.'
  if (error === 'assessment_not_active') return 'The assessment for this campaign is currently unavailable.'
  return error
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; campaignSlug: string }> }
) {
  const t0 = Date.now()
  const traceId = request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id') ?? undefined
  const url = new URL(request.url)
  const { slug: organisationSlug, campaignSlug } = await params

  const route = `/api/assessments/campaigns/${organisationSlug}/${campaignSlug}/submit`

  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`campaign-submit:${ip}`, 20, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route,
      scope: 'public',
      bucket: 'campaign-submit',
      identifierType: 'ip',
      identifier: ip,
      result: rateLimit,
    })
    logRequest({ route, status: 429, durationMs: Date.now() - t0, traceId })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await submitAssessmentCampaign({
    organisationSlug,
    campaignSlug,
    payload: await request.json().catch(() => null),
    runtimeMode: url.searchParams.get('engine') === 'v2' ? 'v2' : 'default',
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' || result.error === 'invalid_responses' || result.error === 'invalid_fields'
        ? 400
        : result.error === 'campaign_not_found'
          ? 404
          : result.error === 'campaign_not_active' || result.error === 'campaign_limit_reached' || result.error === 'assessment_not_active'
            ? 410
            : 500

    logRequest({
      route,
      status,
      durationMs: Date.now() - t0,
      traceId,
      assessmentId: result.assessmentId,
      error: result.error,
    })

    return NextResponse.json({ ok: false, error: result.error, message: campaignErrorMessage(result.error) }, { status })
  }

  logRequest({
    route,
    status: 200,
    durationMs: Date.now() - t0,
    traceId,
    assessmentId: result.assessmentId,
  })

  return NextResponse.json({ ok: true, ...result.data })
}
