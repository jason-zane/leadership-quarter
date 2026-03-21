import { reportAccessTtlSeconds } from '@/utils/services/platform-settings-runtime'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { createReportAccessToken, hasReportAccessTokenSecret } from '@/utils/security/report-access'
import {
  createContactEvent,
  upsertContactByEmail,
} from '@/utils/services/contacts'
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
import {
  createInterestSubmission,
  createSubmissionEvent,
  linkSubmissionToContact,
} from '@/utils/services/submissions'
import { createAdminClient } from '@/utils/supabase/admin'

export type AiReadinessSurveyPayload = {
  firstName?: string
  lastName?: string
  workEmail?: string
  organisation?: string
  role?: string
  consent?: boolean
  responses?: Record<string, number>
}

type ParsedAiReadinessSurveyPayload = {
  firstName: string
  lastName: string
  email: string
  organisation: string
  role: string
  consent: true
  responses: AiReadinessResponses
}

export type SubmitAiReadinessSurveyResult =
  | {
      ok: true
      data: {
        submissionId: string
        reportPath: string
        reportAccessToken: string
        result: {
          openness: number
          riskPosture: number
          capability: number
          opennessBand: string
          riskPostureBand: string
          capabilityBand: string
          overallLabel: string
          recommendations: string[]
          reverseCodedItems: readonly string[]
        }
      }
    }
  | {
      ok: false
      error: string
      message?: string
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

export function parseAiReadinessSurveyPayload(
  payload: AiReadinessSurveyPayload | null
):
  | { ok: true; data: ParsedAiReadinessSurveyPayload }
  | { ok: false; error: 'invalid_payload' | 'invalid_fields' | 'invalid_responses' } {
  if (!payload) {
    return { ok: false, error: 'invalid_payload' }
  }

  const firstName = String(payload.firstName ?? '').trim()
  const lastName = String(payload.lastName ?? '').trim()
  const email = String(payload.workEmail ?? '')
    .trim()
    .toLowerCase()
  const organisation = String(payload.organisation ?? '').trim()
  const role = String(payload.role ?? '').trim()
  const consent = payload.consent === true
  const responses = parseResponses(payload.responses)

  if (!firstName || !lastName || !organisation || !role || !consent || !isValidEmail(email)) {
    return { ok: false, error: 'invalid_fields' }
  }

  if (!responses) {
    return { ok: false, error: 'invalid_responses' }
  }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      email,
      organisation,
      role,
      consent: true,
      responses,
    },
  }
}

export async function submitAiReadinessOrientationSurvey(input: {
  payload: AiReadinessSurveyPayload | null
  ipAddress: string | null
  userAgent: string | null
}): Promise<SubmitAiReadinessSurveyResult> {
  const parsed = parseAiReadinessSurveyPayload(input.payload)
  if (!parsed.ok) {
    return parsed
  }

  const { firstName, lastName, email, organisation, role, consent, responses } = parsed.data
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    }
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return {
      ok: false,
      error: 'missing_report_secret',
      message: 'Report access token secret is not configured.',
    }
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
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })

  if (!submissionResult.data?.id || submissionResult.error) {
    return {
      ok: false,
      error: submissionResult.error ?? 'submission_failed',
    }
  }

  const submissionId = submissionResult.data.id
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
    return { ok: false, error: assessmentPipeline.error }
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
    .update({
      answers: answerValues,
      assessment_submission_id: assessmentPipeline.ok ? assessmentPipeline.data.submissionId : null,
      updated_at: new Date().toISOString(),
    })
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
    expiresInSeconds: reportAccessTtlSeconds(),
  })
  if (!reportAccessToken) {
    return {
      ok: false,
      error: 'missing_report_secret',
      message: 'Report access token could not be generated.',
    }
  }

  return {
    ok: true,
    data: {
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
    },
  }
}
