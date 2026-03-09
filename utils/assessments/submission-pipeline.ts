import type { NumericResponseMap } from '@/utils/assessments/scoring-engine'
import { runScoringEngine } from '@/utils/assessments/engines'
import { resolveAssessmentRuntime } from '@/utils/assessments/runtime'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type SubmitAssessmentParams = {
  adminClient: AdminClient
  assessmentId?: string
  assessmentKey?: string
  responses: Record<string, number>
  invitation?: {
    id: string
    contactId: string | null
    firstName: string | null
    lastName: string | null
    email: string | null
    organisation: string | null
    role: string | null
    startedAt: string | null
  }
  participant?: {
    firstName: string | null
    lastName: string | null
    email: string | null
    organisation: string | null
    role: string | null
    contactId: string | null
  }
  campaignId?: string | null
  demographics?: Record<string, string> | null
  consent?: boolean | null
}

type SubmitAssessmentError =
  | 'assessment_selector_required'
  | 'assessment_not_found'
  | 'assessment_not_active'
  | 'questions_load_failed'
  | 'invalid_responses'
  | 'submission_failed'
  | 'classification_failed'

function toSubmitError(error: string): SubmitAssessmentError {
  if (
    error === 'assessment_selector_required' ||
    error === 'assessment_not_found' ||
    error === 'assessment_not_active' ||
    error === 'questions_load_failed' ||
    error === 'invalid_responses' ||
    error === 'submission_failed' ||
    error === 'classification_failed'
  ) {
    return error
  }
  return 'submission_failed'
}

export type SubmitAssessmentSuccess = {
  submissionId: string
  assessment: {
    id: string
    key: string
    name: string
  }
  normalizedResponses: NumericResponseMap
  scores: Record<string, number>
  bands: Record<string, string>
  classification: { key: string; label: string } | null
  recommendations: string[]
}

type SubmitAssessmentResult =
  | { ok: true; data: SubmitAssessmentSuccess }
  | { ok: false; error: SubmitAssessmentError }

function isLikertValue(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5
}

function reverseLikert(value: number) {
  return 6 - value
}

export async function submitAssessment(params: SubmitAssessmentParams): Promise<SubmitAssessmentResult> {
  const runtimeResult = await resolveAssessmentRuntime(params.adminClient, {
    assessmentId: params.assessmentId,
    assessmentKey: params.assessmentKey,
  })
  if (!runtimeResult.ok) return { ok: false, error: toSubmitError(runtimeResult.error) }

  const runtime = runtimeResult.runtime
  if (runtime.status !== 'active') {
    return { ok: false, error: 'assessment_not_active' }
  }

  const normalizedResponses: NumericResponseMap = {}
  for (const question of runtime.questions) {
    const raw = params.responses[question.questionKey]
    if (!isLikertValue(raw)) {
      return { ok: false, error: 'invalid_responses' }
    }
    normalizedResponses[question.questionKey] = question.isReverseCoded ? reverseLikert(raw) : raw
  }

  const nowIso = new Date().toISOString()
  const firstName = params.invitation?.firstName ?? params.participant?.firstName ?? null
  const lastName = params.invitation?.lastName ?? params.participant?.lastName ?? null
  const email = params.invitation?.email ?? params.participant?.email ?? null
  const organisation = params.invitation?.organisation ?? params.participant?.organisation ?? null
  const role = params.invitation?.role ?? params.participant?.role ?? null
  const contactId = params.invitation?.contactId ?? params.participant?.contactId ?? null
  const consent = params.consent ?? true

  // Insert submission first, then compute/store engine outputs and patch the row.
  const { data: submissionRow, error: submissionInsertError } = await params.adminClient
    .from('assessment_submissions')
    .insert({
      assessment_id: runtime.id,
      invitation_id: params.invitation?.id ?? null,
      campaign_id: params.campaignId ?? null,
      contact_id: contactId,
      first_name: firstName,
      last_name: lastName,
      email,
      organisation,
      role,
      consent,
      responses: params.responses,
      normalized_responses: normalizedResponses,
      scores: {},
      bands: {},
      classification: {},
      recommendations: [],
      demographics: params.demographics ?? null,
      updated_at: nowIso,
    })
    .select('id')
    .single()

  if (submissionInsertError || !submissionRow?.id) {
    return { ok: false, error: 'submission_failed' }
  }

  const engineOutput = await runScoringEngine(runtime.scoringEngine, {
    adminClient: params.adminClient,
    assessmentRuntime: runtime,
    submissionId: submissionRow.id,
    rawResponses: params.responses,
    normalizedResponses,
  })

  if (runtime.scoringEngine !== 'psychometric' && !engineOutput.classification) {
    return { ok: false, error: 'classification_failed' }
  }

  const classificationJson = engineOutput.classification
    ? {
        key: engineOutput.classification.key,
        label: engineOutput.classification.label,
      }
    : {}

  const { error: scoreUpdateError } = await params.adminClient
    .from('assessment_submissions')
    .update({
      scores: engineOutput.scores,
      bands: engineOutput.bands,
      classification: classificationJson,
      recommendations: engineOutput.recommendations,
      updated_at: nowIso,
    })
    .eq('id', submissionRow.id)

  if (scoreUpdateError) {
    return { ok: false, error: 'submission_failed' }
  }

  if (params.invitation?.id) {
    await params.adminClient
      .from('assessment_invitations')
      .update({
        status: 'completed',
        started_at: params.invitation.startedAt ?? nowIso,
        completed_at: nowIso,
        submission_id: submissionRow.id,
        updated_at: nowIso,
      })
      .eq('id', params.invitation.id)
  }

  return {
    ok: true,
    data: {
      submissionId: submissionRow.id,
      assessment: {
        id: runtime.id,
        key: runtime.key,
        name: runtime.name,
      },
      normalizedResponses,
      scores: engineOutput.scores,
      bands: engineOutput.bands,
      classification: engineOutput.classification
        ? {
            key: engineOutput.classification.key,
            label: engineOutput.classification.label,
          }
        : null,
      recommendations: engineOutput.recommendations,
    },
  }
}
