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

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t0 = Date.now()
  const traceId = request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id') ?? undefined

  const { slug } = await params

  // Rate limit by IP: 20 submissions per minute per IP
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`campaign-submit:${ip}`, 20, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: `/api/assessments/campaigns/${slug}/submit`,
      scope: 'public',
      bucket: 'campaign-submit',
      identifierType: 'ip',
      identifier: ip,
      result: rateLimit,
    })
    logRequest({ route: `/api/assessments/campaigns/${slug}/submit`, status: 429, durationMs: Date.now() - t0, traceId })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await submitAssessmentCampaign({
    slug,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' || result.error === 'invalid_responses'
        ? 400
        : result.error === 'campaign_not_found'
          ? 404
          : result.error === 'campaign_not_active' || result.error === 'assessment_not_active'
            ? 410
            : 500

    logRequest({
      route: `/api/assessments/campaigns/${slug}/submit`,
      status,
      durationMs: Date.now() - t0,
      traceId,
      assessmentId: result.assessmentId,
      error: result.error,
    })

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  logRequest({
    route: `/api/assessments/campaigns/${slug}/submit`,
    status: 200,
    durationMs: Date.now() - t0,
    traceId,
    assessmentId: result.assessmentId,
  })

  return NextResponse.json({ ok: true, ...result.data })
}
