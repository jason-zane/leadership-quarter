import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/security/ratelimit'
import { getAssessmentReportData, getAssessmentReportRecipientEmail } from '@/utils/reports/assessment-report'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { enqueueAssessmentReportPdfEmailJob } from '@/utils/services/email-jobs'
import { createAdminClient } from '@/utils/supabase/admin'

type Payload = {
  access?: string
}

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Payload | null
  const access = String(body?.access ?? '').trim()
  const payload = access ? verifyReportAccessToken(access, 'assessment') : null

  if (!payload) {
    return NextResponse.json(
      { ok: false, error: 'invalid_access', message: 'This report link is no longer valid.' },
      { status: 403 }
    )
  }

  const rateLimit = await checkRateLimit(`assessment-report-email:${payload.submissionId}:${getIpAddress(request)}`)
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests. Please wait and try again.' },
      { status: 429 }
    )
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json(
      { ok: false, error: 'missing_service_role', message: 'Email sending is not configured.' },
      { status: 500 }
    )
  }

  const report = await getAssessmentReportData(adminClient, payload.submissionId)
  if (!report) {
    return NextResponse.json(
      { ok: false, error: 'report_not_found', message: 'We could not load this report.' },
      { status: 404 }
    )
  }

  const recipientEmail = getAssessmentReportRecipientEmail(report)
  if (!recipientEmail) {
    return NextResponse.json(
      { ok: false, error: 'missing_recipient_email', message: 'No email address is available for this report.' },
      { status: 400 }
    )
  }

  const queued = await enqueueAssessmentReportPdfEmailJob(adminClient, {
    submissionId: report.submissionId,
    to: recipientEmail,
  })

  if (queued.error) {
    return NextResponse.json(
      { ok: false, error: 'queue_failed', message: 'Could not queue the report email.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: `Report email queued for ${recipientEmail}.`,
  })
}
