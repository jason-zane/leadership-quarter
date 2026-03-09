import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/utils/security/origin'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import {
  submitAiReadinessOrientationSurvey,
  type AiReadinessSurveyPayload,
} from '@/utils/services/ai-readiness-survey'

function getErrorStatus(error: string) {
  if (error === 'invalid_payload' || error === 'invalid_fields' || error === 'invalid_responses') {
    return 400
  }
  return 500
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_origin', message: 'Invalid request origin.' },
      { status: 403 }
    )
  }

  const ipAddress = getClientIp(request)
  const rateLimit = await checkRateLimit(`ai-readiness-survey:${ipAddress}`, 10, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/assessments/ai-readiness/submit',
      scope: 'public',
      bucket: 'ai-readiness-survey',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const body = (await request.json().catch(() => null)) as AiReadinessSurveyPayload | null
  const result = await submitAiReadinessOrientationSurvey({
    payload: body,
    ipAddress,
    userAgent: request.headers.get('user-agent'),
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.message ? { message: result.message } : {}),
      },
      { status: getErrorStatus(result.error) }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
