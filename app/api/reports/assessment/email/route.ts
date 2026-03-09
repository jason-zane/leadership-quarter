import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import {
  queueAssessmentReportEmail,
  resolveAssessmentReportEmailAccess,
} from '@/utils/services/assessment-report-email'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { access?: string } | null
  const access = String(body?.access ?? '').trim()
  const accessResult = resolveAssessmentReportEmailAccess(access)

  if (!accessResult.ok) {
    return NextResponse.json(
      { ok: false, error: accessResult.error, message: accessResult.message },
      { status: 403 }
    )
  }

  const ipAddress = getClientIp(request)
  const rateLimit = await checkRateLimit(
    `assessment-report-email:${accessResult.submissionId}:${ipAddress}`,
    10,
    60
  )
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/reports/assessment/email',
      scope: 'public',
      bucket: 'assessment-report-email',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests. Please wait and try again.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await queueAssessmentReportEmail({
    submissionId: accessResult.submissionId,
  })

  if (!result.ok) {
    const status =
      result.error === 'report_not_found'
        ? 404
        : result.error === 'missing_recipient_email'
          ? 400
          : 500

    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
