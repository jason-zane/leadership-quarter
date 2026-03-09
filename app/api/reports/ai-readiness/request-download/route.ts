import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/utils/security/origin'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import {
  requestAiReadinessReportDownload,
  type FrameworkReportDownloadPayload,
} from '@/utils/services/framework-report-download'

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
  const rateLimit = await checkRateLimit(`ai-readiness-report:${ipAddress}`, 10, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/reports/ai-readiness/request-download',
      scope: 'public',
      bucket: 'ai-readiness-report',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await requestAiReadinessReportDownload({
    payload: (await request.json().catch(() => null)) as FrameworkReportDownloadPayload | null,
    ipAddress,
    userAgent: request.headers.get('user-agent'),
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' || result.error === 'invalid_fields'
        ? 400
        : 500

    return NextResponse.json(
      { ok: false, error: result.error, ...(result.message ? { message: result.message } : {}) },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
