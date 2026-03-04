import { NextResponse } from 'next/server'
import { createReportAccessToken, hasReportAccessTokenSecret } from '@/utils/security/report-access'
import { sendSurveyCompletionEmail } from '@/utils/assessments/email'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { createAdminClient } from '@/utils/supabase/admin'
import { getPortalBaseUrl } from '@/utils/hosts'

type SubmitPayload = {
  responses?: Record<string, number>
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

function getBaseUrl() {
  return getPortalBaseUrl()
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
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
  const payload = (await request.json().catch(() => null)) as SubmitPayload | null
  if (!payload?.responses) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const { data: invitationRow, error } = await adminClient
    .from('assessment_invitations')
    .select('id, assessment_id, token, email, first_name, last_name, organisation, role, contact_id, campaign_id, status, started_at, completed_at, expires_at, assessments(id, key, name, status)')
    .eq('token', token)
    .maybeSingle()

  if (error || !invitationRow) {
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
    return NextResponse.json({ ok: false, error: 'survey_not_active' }, { status: 410 })
  }

  if (invitationRow.status === 'completed' || invitationRow.completed_at) {
    return NextResponse.json({ ok: false, error: 'invitation_completed' }, { status: 410 })
  }

  if (isExpired(invitationRow.expires_at)) {
    await adminClient
      .from('assessment_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitationRow.id)

    return NextResponse.json({ ok: false, error: 'invitation_expired' }, { status: 410 })
  }

  const pipeline = await submitAssessment({
    adminClient,
    assessmentId: invitationRow.assessment_id,
    responses: payload.responses,
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
    return NextResponse.json({ ok: false, error: pipeline.error }, { status })
  }

  const reportAccessToken = createReportAccessToken({
    report: 'ai_survey',
    submissionId: pipeline.data.submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })

  if (!reportAccessToken) {
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  const reportPath = '/framework/lq-ai-readiness/orientation-survey/report'
  const reportUrl = `${getBaseUrl()}${reportPath}?access=${encodeURIComponent(reportAccessToken)}`

  await sendSurveyCompletionEmail({
    to: invitationRow.email,
    firstName: invitationRow.first_name,
    surveyName: assessment.name,
    classificationLabel: pipeline.data.classification?.label ?? 'Assessment complete',
    reportUrl,
  })

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
