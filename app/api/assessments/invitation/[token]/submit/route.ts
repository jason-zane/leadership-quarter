import { NextResponse } from 'next/server'
import { createReportAccessToken, hasReportAccessTokenSecret } from '@/utils/security/report-access'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { createAdminClient } from '@/utils/supabase/admin'
import { getPortalBaseUrl } from '@/utils/hosts'
import { InvitationSubmitSchema } from '@/utils/assessments/submission-schema'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { logRequest } from '@/utils/logger'

export const maxDuration = 30

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

function getBaseUrl() {
  return getPortalBaseUrl()
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const t0 = Date.now()
  const traceId = request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id') ?? undefined

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json(
      { ok: false, error: 'missing_service_role', message: 'Supabase admin credentials are not configured.' },
      { status: 500 }
    )
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_report_secret',
        message: 'Report access token secret is not configured.',
      },
      { status: 500 }
    )
  }

  const { token } = await params

  // Rate limit by token: 5 submissions per minute
  const { allowed } = await checkRateLimit(`submit:${token}`, 5, 60)
  if (!allowed) {
    logRequest({ route: '/api/assessments/invitation/submit', status: 429, durationMs: Date.now() - t0, traceId })
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = InvitationSubmitSchema.safeParse(rawBody)
  if (!parsed.success) {
    logRequest({ route: '/api/assessments/invitation/submit', status: 400, durationMs: Date.now() - t0, traceId })
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const { responses } = parsed.data

  const { data: invitationRow, error } = await adminClient
    .from('assessment_invitations')
    .select('id, assessment_id, token, email, first_name, last_name, organisation, role, contact_id, campaign_id, status, started_at, completed_at, expires_at, assessments(id, key, name, status)')
    .eq('token', token)
    .maybeSingle()

  if (error || !invitationRow) {
    logRequest({ route: '/api/assessments/invitation/submit', status: 404, durationMs: Date.now() - t0, traceId })
    return NextResponse.json({ ok: false, error: 'invitation_not_found' }, { status: 404 })
  }

  const assessmentRelation = invitationRow.assessments as unknown
  const assessment = (Array.isArray(assessmentRelation) ? assessmentRelation[0] : assessmentRelation) as
    | {
    id: string
    name: string
    status: string
      }
    | null

  if (!assessment || assessment.status !== 'active') {
    logRequest({ route: '/api/assessments/invitation/submit', status: 410, durationMs: Date.now() - t0, traceId, assessmentId: assessment?.id })
    return NextResponse.json({ ok: false, error: 'survey_not_active' }, { status: 410 })
  }

  if (isExpired(invitationRow.expires_at)) {
    await adminClient
      .from('assessment_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitationRow.id)

    logRequest({ route: '/api/assessments/invitation/submit', status: 410, durationMs: Date.now() - t0, traceId, invitationId: invitationRow.id })
    return NextResponse.json({ ok: false, error: 'invitation_expired' }, { status: 410 })
  }

  // Idempotency: if already completed, return the existing result
  if (invitationRow.status === 'completed' || invitationRow.completed_at) {
    const { data: existingSubmission } = await adminClient
      .from('assessment_submissions')
      .select('id, report_access_token')
      .eq('invitation_id', invitationRow.id)
      .maybeSingle()

    if (existingSubmission?.report_access_token) {
      const reportPath = '/assess/r/assessment'
      logRequest({ route: '/api/assessments/invitation/submit', status: 200, durationMs: Date.now() - t0, traceId, invitationId: invitationRow.id })
      return NextResponse.json({
        ok: true,
        submissionId: existingSubmission.id,
        reportAccessToken: existingSubmission.report_access_token,
        reportPath,
      })
    }

    logRequest({ route: '/api/assessments/invitation/submit', status: 410, durationMs: Date.now() - t0, traceId, invitationId: invitationRow.id })
    return NextResponse.json({ ok: false, error: 'invitation_completed' }, { status: 410 })
  }

  const pipeline = await submitAssessment({
    adminClient,
    assessmentId: invitationRow.assessment_id,
    responses,
    invitation: {
      id: invitationRow.id,
      contactId: invitationRow.contact_id,
      firstName: invitationRow.first_name,
      lastName: invitationRow.last_name,
      email: invitationRow.email,
      organisation: invitationRow.organisation,
      role: invitationRow.role,
      startedAt: invitationRow.started_at,
    },
    campaignId: invitationRow.campaign_id,
    consent: true,
  })

  if (!pipeline.ok) {
    const status = pipeline.error === 'invalid_responses' ? 400 : 500
    logRequest({ route: '/api/assessments/invitation/submit', status, durationMs: Date.now() - t0, traceId, invitationId: invitationRow.id, error: pipeline.error })
    return NextResponse.json({ ok: false, error: pipeline.error }, { status })
  }

  const reportAccessToken = createReportAccessToken({
    report: 'assessment',
    submissionId: pipeline.data.submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })

  if (!reportAccessToken) {
    logRequest({ route: '/api/assessments/invitation/submit', status: 500, durationMs: Date.now() - t0, traceId, invitationId: invitationRow.id, error: 'missing_report_secret' })
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  const reportPath = '/assess/r/assessment'
  const reportUrl = `${getBaseUrl()}${reportPath}?access=${encodeURIComponent(reportAccessToken)}`

  // Queue completion email asynchronously — do not block the response
  await adminClient.from('email_jobs').insert({
    job_type: 'assessment_completion',
    payload: {
      to: invitationRow.email,
      firstName: invitationRow.first_name,
      surveyName: assessment.name,
      classificationLabel: pipeline.data.classification?.label ?? 'Assessment complete',
      reportUrl,
    },
    status: 'pending',
    run_at: new Date().toISOString(),
  })

  logRequest({ route: '/api/assessments/invitation/submit', status: 200, durationMs: Date.now() - t0, traceId, invitationId: invitationRow.id, assessmentId: invitationRow.assessment_id })

  return NextResponse.json({
    ok: true,
    submissionId: pipeline.data.submissionId,
    reportAccessToken,
    reportPath,
    scores: pipeline.data.scores,
    bands: pipeline.data.bands,
    classification: pipeline.data.classification,
    recommendations: pipeline.data.recommendations,
  })
}
