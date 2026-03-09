import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/utils/security/origin'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { submitInquiry, type InquiryPayload } from '@/utils/services/inquiry'

export async function POST(request: Request) {
  try {
    await assertSameOrigin()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_origin' }, { status: 403 })
  }

  const ipAddress = getClientIp(request)
  const rateLimit = await checkRateLimit(`inquiry:${ipAddress}`, 10, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/inquiry',
      scope: 'public',
      bucket: 'inquiry',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await submitInquiry({
    payload: (await request.json().catch(() => null)) as InquiryPayload | null,
    ipAddress,
    userAgent: request.headers.get('user-agent'),
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' || result.error === 'invalid_fields' || result.error === 'invalid_name'
        ? 400
        : 500

    return NextResponse.json(
      { ok: false, error: result.error },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
