import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import type { ReportDocumentType } from '@/utils/reports/report-document-types'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { downloadReportPdf } from '@/utils/services/report-pdf'

export const runtime = 'nodejs'
export const maxDuration = 60

const SUPPORTED_REPORT_TYPES: ReportDocumentType[] = ['assessment', 'lq8', 'ai', 'ai_survey']

export async function GET(
  request: Request,
  context: { params: Promise<{ reportType: string }> }
) {
  const { reportType } = await context.params

  if (!SUPPORTED_REPORT_TYPES.includes(reportType as ReportDocumentType)) {
    return NextResponse.json({ ok: false, error: 'invalid_report_type' }, { status: 404 })
  }

  const accessToken = new URL(request.url).searchParams.get('access') ?? ''
  const ipAddress = getClientIp(request)
  const rateLimit = await checkRateLimit(`report-pdf:${reportType}:${ipAddress}`, 10, 60)

  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: `/api/reports/${reportType}/pdf`,
      scope: 'public',
      bucket: 'report-pdf',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests. Please wait and try again.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await downloadReportPdf({
    reportType: reportType as ReportDocumentType,
    accessToken,
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_access'
        ? 403
        : result.error === 'report_not_found'
          ? 404
          : result.error === 'pdf_render_failed'
            ? 503
            : 500

    return NextResponse.json(
      { ok: false, error: result.error, ...(result.message ? { message: result.message } : {}) },
      { status }
    )
  }

  return new NextResponse(new Uint8Array(result.data.pdfBuffer), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${result.data.filename}"`,
      'cache-control': 'private, no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  })
}
