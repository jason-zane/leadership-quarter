import { NextResponse } from 'next/server'
import { assertSameOrigin } from '@/utils/security/origin'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import {
  requestLq8ReportDownload,
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
  const rateLimit = await checkRateLimit(`lq8-report:${ipAddress}`, 10, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/reports/lq8/request-download',
      scope: 'public',
      bucket: 'lq8-report',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await requestLq8ReportDownload({
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
