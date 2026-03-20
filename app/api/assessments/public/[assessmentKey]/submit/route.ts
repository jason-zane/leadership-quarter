import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  submitPublicAssessment,
  type SubmitPublicAssessmentPayload,
} from '@/utils/services/assessment-public-submission'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'

export async function POST(request: Request, { params }: { params: Promise<{ assessmentKey: string }> }) {
  const { assessmentKey } = await params
  const ipAddress = getClientIp(request)
  const rateLimit = await checkRateLimit(
    `public-assessment-submit:${assessmentKey}:${ipAddress}`,
    20,
    60
  )
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: `/api/assessments/public/${assessmentKey}/submit`,
      scope: 'public',
      bucket: 'public-assessment-submit',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await submitPublicAssessment({
    assessmentKey,
    payload: (await request.json().catch(() => null)) as SubmitPublicAssessmentPayload | null,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error === 'invalid_payload' || result.error === 'invalid_responses' ? 400 : 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
