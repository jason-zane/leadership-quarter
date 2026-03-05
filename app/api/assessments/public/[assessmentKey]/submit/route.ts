import { NextResponse } from 'next/server'
import { createReportAccessToken, hasReportAccessTokenSecret } from '@/utils/security/report-access'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { createAdminClient } from '@/utils/supabase/admin'

type SubmitPayload = {
  responses?: Record<string, number>
}

export async function POST(request: Request, { params }: { params: Promise<{ assessmentKey: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  const { assessmentKey } = await params
  const payload = (await request.json().catch(() => null)) as SubmitPayload | null

  if (!payload?.responses) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const pipeline = await submitAssessment({
    adminClient,
    assessmentKey,
    responses: payload.responses,
    participant: {
      firstName: null,
      lastName: null,
      email: null,
      organisation: null,
      role: null,
      contactId: null,
    },
    consent: true,
  })

  if (!pipeline.ok) {
    return NextResponse.json({ ok: false, error: pipeline.error }, { status: pipeline.error === 'invalid_responses' ? 400 : 500 })
  }

  const reportAccessToken = createReportAccessToken({
    report: 'assessment',
    submissionId: pipeline.data.submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })

  if (!reportAccessToken) {
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    submissionId: pipeline.data.submissionId,
    reportPath: '/assess/r/assessment',
    reportAccessToken,
  })
}
