import { NextResponse } from 'next/server'
import { createReportAccessToken, hasReportAccessTokenSecret } from '@/utils/security/report-access'
import { classifyResult, computeScores, getBands } from '@/utils/surveys/scoring-engine'
import { sendSurveyCompletionEmail } from '@/utils/surveys/email'
import type { ScoringConfig } from '@/utils/surveys/types'
import { createAdminClient } from '@/utils/supabase/admin'

type SubmitPayload = {
  responses?: Record<string, number>
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

function reverseLikert(value: number) {
  return 6 - value
}

function isLikertValue(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5
}

function getBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (appUrl) return appUrl.replace(/\/$/, '')
  return 'http://localhost:3000'
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
    .from('survey_invitations')
    .select('id, survey_id, token, email, first_name, last_name, organisation, role, contact_id, status, started_at, completed_at, expires_at, surveys(id, key, name, scoring_config, status)')
    .eq('token', token)
    .maybeSingle()

  if (error || !invitationRow) {
    return NextResponse.json({ ok: false, error: 'invitation_not_found' }, { status: 404 })
  }

  const surveyRelation = invitationRow.surveys as unknown
  const survey = (Array.isArray(surveyRelation) ? surveyRelation[0] : surveyRelation) as
    | {
    id: string
    key: string
    name: string
    status: string
    scoring_config: ScoringConfig
      }
    | null

  if (!survey || survey.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'survey_not_active' }, { status: 410 })
  }

  if (invitationRow.status === 'completed' || invitationRow.completed_at) {
    return NextResponse.json({ ok: false, error: 'invitation_completed' }, { status: 410 })
  }

  if (isExpired(invitationRow.expires_at)) {
    await adminClient
      .from('survey_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitationRow.id)

    return NextResponse.json({ ok: false, error: 'invitation_expired' }, { status: 410 })
  }

  const { data: questionRows, error: questionError } = await adminClient
    .from('survey_questions')
    .select('question_key, is_reverse_coded')
    .eq('survey_id', survey.id)
    .eq('is_active', true)

  if (questionError || !questionRows || questionRows.length === 0) {
    return NextResponse.json({ ok: false, error: 'questions_load_failed' }, { status: 500 })
  }

  const responses = payload.responses
  const normalizedResponses: Record<string, number> = {}

  for (const question of questionRows as { question_key: string; is_reverse_coded: boolean }[]) {
    const raw = responses[question.question_key]
    if (!isLikertValue(raw)) {
      return NextResponse.json({ ok: false, error: 'invalid_responses' }, { status: 400 })
    }
    normalizedResponses[question.question_key] = question.is_reverse_coded ? reverseLikert(raw) : raw
  }

  const scores = computeScores(normalizedResponses, survey.scoring_config)
  const bands = getBands(scores, survey.scoring_config)
  const classification = classifyResult(scores, survey.scoring_config)

  if (!classification) {
    return NextResponse.json({ ok: false, error: 'classification_failed' }, { status: 500 })
  }

  const nowIso = new Date().toISOString()

  const { data: submissionRow, error: submissionError } = await adminClient
    .from('survey_submissions')
    .insert({
      survey_id: survey.id,
      invitation_id: invitationRow.id,
      contact_id: invitationRow.contact_id,
      first_name: invitationRow.first_name,
      last_name: invitationRow.last_name,
      email: invitationRow.email,
      organisation: invitationRow.organisation,
      role: invitationRow.role,
      consent: true,
      responses,
      normalized_responses: normalizedResponses,
      scores,
      bands,
      classification: {
        key: classification.key,
        label: classification.label,
      },
      recommendations: classification.recommendations,
      updated_at: nowIso,
    })
    .select('id')
    .single()

  if (submissionError || !submissionRow?.id) {
    return NextResponse.json({ ok: false, error: 'submission_failed' }, { status: 500 })
  }

  await adminClient
    .from('survey_invitations')
    .update({
      status: 'completed',
      started_at: invitationRow.started_at ?? nowIso,
      completed_at: nowIso,
      submission_id: submissionRow.id,
      updated_at: nowIso,
    })
    .eq('id', invitationRow.id)

  const reportAccessToken = createReportAccessToken({
    report: 'ai_survey',
    submissionId: submissionRow.id,
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
    surveyName: survey.name,
    classificationLabel: classification.label,
    reportUrl,
  })

  return NextResponse.json({
    ok: true,
    submissionId: submissionRow.id,
    reportAccessToken,
    reportPath,
    scores,
    bands,
    classification: {
      key: classification.key,
      label: classification.label,
    },
    recommendations: classification.recommendations,
  })
}
