import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { assertSameOrigin } from '@/utils/security/origin'
import { checkRateLimit } from '@/utils/security/ratelimit'
import {
  createInterestSubmission,
  createSubmissionEvent,
  linkSubmissionToContact,
} from '@/utils/services/submissions'
import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { createReportAccessToken, hasReportAccessTokenSecret } from '@/utils/security/report-access'
import {
  AI_READINESS_QUESTION_KEYS,
  AI_READINESS_REVERSE_CODED_KEYS,
  classifyAiReadiness,
  computeAiReadinessScores,
  getAiReadinessBands,
  getAiReadinessRecommendations,
  normalizeResponses,
  type AiReadinessResponses,
  type LikertValue,
} from '@/utils/services/ai-readiness-scoring'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'

type SurveyPayload = {
  firstName?: string
  lastName?: string
  workEmail?: string
  organisation?: string
  role?: string
  consent?: boolean
  responses?: Record<string, number>
}

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isLikertValue(value: number): value is LikertValue {
  return Number.isInteger(value) && value >= 1 && value <= 5
}

function parseResponses(input: Record<string, number> | undefined): AiReadinessResponses | null {
  if (!input) return null

  const parsed = {} as AiReadinessResponses
  for (const key of AI_READINESS_QUESTION_KEYS) {
    const value = input[key]
    if (!isLikertValue(value)) {
      return null
    }
    parsed[key] = value
  }

  return parsed
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_origin', message: 'Invalid request origin.' },
      { status: 403 }
    )
  }

  const ipAddress = getIpAddress(request)
  const rateLimit = await checkRateLimit(`ai-readiness-survey:${ipAddress}`)
  if (!rateLimit.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as SurveyPayload | null
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const email = String(body.workEmail ?? '')
    .trim()
    .toLowerCase()
  const organisation = String(body.organisation ?? '').trim()
  const role = String(body.role ?? '').trim()
  const consent = body.consent === true
  const responses = parseResponses(body.responses)

  if (!firstName || !lastName || !organisation || !role || !consent || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
  }

  if (!responses) {
    return NextResponse.json({ ok: false, error: 'invalid_responses' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_service_role',
        message: 'Supabase admin credentials are not configured.',
      },
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

  const source = 'site:ai_readiness_orientation_survey'
  const formKey = 'ai_readiness_orientation_survey_v2'

  const submissionResult = await createInterestSubmission(adminClient, {
    firstName,
    lastName,
    email,
    source,
    formKey,
    schemaVersion: 1,
    answers: {
      first_name: firstName,
      last_name: lastName,
      email,
      organisation,
      role,
      consent,
      ...responses,
      reverse_coded_items: AI_READINESS_REVERSE_CODED_KEYS.join(','),
    },
    rawPayload: {
      firstName,
      lastName,
      workEmail: email,
      organisation,
      role,
      consent,
      ...responses,
    },
    reviewStatus: 'pending_review',
    priority: 'normal',
    ipAddress,
    userAgent: request.headers.get('user-agent'),
  })

  if (!submissionResult.data?.id || submissionResult.error) {
    return NextResponse.json(
      { ok: false, error: submissionResult.error ?? 'submission_failed' },
      { status: 500 }
    )
  }

  const submissionId = submissionResult.data.id

  // Persist in assessment_submissions via the shared assessment pipeline.
  const assessmentPipeline = await submitAssessment({
    adminClient,
    assessmentKey: 'ai_readiness_orientation_v1',
    responses,
    participant: {
      firstName,
      lastName,
      email,
      organisation,
      role,
      contactId: null,
    },
    consent,
  })

  if (!assessmentPipeline.ok && assessmentPipeline.error !== 'assessment_not_found') {
    return NextResponse.json({ ok: false, error: assessmentPipeline.error }, { status: 500 })
  }

  const fallbackNormalized = normalizeResponses(responses)
  const fallbackScores = computeAiReadinessScores(responses)
  const fallbackBands = getAiReadinessBands(fallbackScores)
  const fallbackClassification = classifyAiReadiness(fallbackScores)
  const fallbackRecommendations = getAiReadinessRecommendations(fallbackClassification)

  const normalizedResponses: Record<string, number> = assessmentPipeline.ok
    ? assessmentPipeline.data.normalizedResponses
    : fallbackNormalized
  const scores: Record<string, number> = assessmentPipeline.ok
    ? assessmentPipeline.data.scores
    : fallbackScores
  const bands: Record<string, string> = assessmentPipeline.ok
    ? assessmentPipeline.data.bands
    : fallbackBands
  const classification = assessmentPipeline.ok
    ? (assessmentPipeline.data.classification?.label ?? fallbackClassification)
    : fallbackClassification
  const recommendations = assessmentPipeline.ok
    ? assessmentPipeline.data.recommendations
    : fallbackRecommendations
  const opennessScore = Number(scores.openness ?? 0)
  const riskPostureScore = Number(scores.riskPosture ?? 0)
  const capabilityScore = Number(scores.capability ?? 0)
  const opennessBand = String(bands.openness ?? '')
  const riskPostureBand = String(bands.riskPosture ?? '')
  const capabilityBand = String(bands.capability ?? '')

  const answerValues = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role,
    consent,
    ...responses,
    q4_reversed: normalizedResponses.q4,
    q10_reversed: normalizedResponses.q10,
    q16_reversed: normalizedResponses.q16,
    openness_score: opennessScore,
    risk_posture_score: riskPostureScore,
    capability_score: capabilityScore,
    openness_band: opennessBand,
    risk_posture_band: riskPostureBand,
    capability_band: capabilityBand,
    classification,
    reverse_coded_items: AI_READINESS_REVERSE_CODED_KEYS.join(','),
    recommendation_summary: recommendations.join(' | '),
  }

  await adminClient
    .from('interest_submissions')
    .update({ answers: answerValues, updated_at: new Date().toISOString() })
    .eq('id', submissionId)

  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'ai_readiness_survey_submitted',
    eventData: {
      source,
      form_key: formKey,
      openness_score: opennessScore,
      risk_posture_score: riskPostureScore,
      capability_score: capabilityScore,
      classification,
    },
  })

  const contactResult = await upsertContactByEmail(adminClient, {
    firstName,
    lastName,
    email,
    source,
  })

  if (contactResult.data?.id) {
    const contactId = contactResult.data.id
    await linkSubmissionToContact(adminClient, submissionId, contactId)
    await createContactEvent(adminClient, {
      contactId,
      eventType: 'ai_readiness_survey_submitted',
      eventData: { submission_id: submissionId, source, classification },
    })
  }

  const reportAccessToken = createReportAccessToken({
    report: 'ai_survey',
    submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })
  if (!reportAccessToken) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_report_secret',
        message: 'Report access token could not be generated.',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    reportPath: '/framework/lq-ai-readiness/orientation-survey/report',
    reportAccessToken,
    result: {
      openness: opennessScore,
      riskPosture: riskPostureScore,
      capability: capabilityScore,
      opennessBand,
      riskPostureBand,
      capabilityBand,
      overallLabel: classification,
      recommendations,
      reverseCodedItems: AI_READINESS_REVERSE_CODED_KEYS,
    },
  })
}
