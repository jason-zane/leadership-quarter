import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { createAdminClient } from '@/utils/supabase/admin'
import { assembleReportDocument, resolveReportAccessPayload } from '@/utils/reports/assemble-report-document'
import type { ReportDocumentType } from '@/utils/reports/report-document-types'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { createReportExportJob } from '@/utils/services/report-export-jobs'

const SUPPORTED_REPORT_TYPES: ReportDocumentType[] = ['assessment', 'lq8', 'ai', 'ai_survey']

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { reportType?: string; access?: string }
    | null

  const reportType = String(body?.reportType ?? '').trim() as ReportDocumentType
  const accessToken = String(body?.access ?? '').trim()

  if (!SUPPORTED_REPORT_TYPES.includes(reportType) || !accessToken) {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 })
  }

  const ipAddress = getClientIp(request)
  const rateLimit = await checkRateLimit(`report-export:${reportType}:${ipAddress}`, 5, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/reports/export',
      scope: 'public',
      bucket: 'report-export',
      identifierType: 'ip',
      identifier: ipAddress,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests. Please wait and try again.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const payload = resolveReportAccessPayload({ reportType, accessToken })
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'invalid_access' }, { status: 403 })
  }

  const assembled = await assembleReportDocument({ reportType, accessToken })
  if (!assembled.ok) {
    const status = assembled.error === 'invalid_access' ? 403 : assembled.error === 'report_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: assembled.error }, { status })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const queued = await createReportExportJob(adminClient, {
    reportType,
    subjectRef: payload.submissionId,
    selectionMode: payload.selectionMode,
    reportVariantId: payload.reportVariantId,
  })

  if (!queued.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: queued.error,
        message: 'PDF export queue is unavailable. Use the direct PDF download path instead.',
      },
      { status: 503 }
    )
  }

  return NextResponse.json({ ok: true, jobId: queued.data.jobId }, { status: 202 })
}
