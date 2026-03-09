import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { createAdminClient } from '@/utils/supabase/admin'
import type { ReportDocumentType } from '@/utils/reports/report-document-types'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { getReportExportStatus } from '@/utils/services/report-export-jobs'

const SUPPORTED_REPORT_TYPES: ReportDocumentType[] = ['assessment', 'lq8', 'ai', 'ai_survey']

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params
  const searchParams = new URL(request.url).searchParams
  const reportType = String(searchParams.get('reportType') ?? '').trim() as ReportDocumentType
  const accessToken = String(searchParams.get('access') ?? '').trim()

  if (!SUPPORTED_REPORT_TYPES.includes(reportType) || !accessToken) {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 })
  }

  const ipAddress = getClientIp(request)
  const rateLimit = await checkRateLimit(`report-export-status:${reportType}:${ipAddress}`, 30, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/reports/export/[jobId]',
      scope: 'public',
      bucket: 'report-export-status',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests. Please wait and try again.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const result = await getReportExportStatus({
    adminClient,
    jobId,
    reportType,
    accessToken,
  })

  if (!result.ok) {
    const status =
      result.error === 'forbidden' ? 403 : result.error === 'not_found' ? 404 : result.error === 'missing_service_role' ? 500 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
