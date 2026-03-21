import type { NumericResponseMap } from '@/utils/assessments/scoring-engine'
import { resolveAssessmentRuntime } from '@/utils/assessments/runtime'
import type { CampaignDemographics } from '@/utils/assessments/campaign-types'
import { buildV2SubmissionArtifacts, type V2SubmissionArtifacts } from '@/utils/assessments/assessment-runtime-model'
import { ensureAssessmentParticipant } from '@/utils/services/assessment-participants'
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
  demographics?: CampaignDemographics | null
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
  reportAccessKind?: 'assessment'
  reportPath?: '/assess/r/assessment'
}

type SubmitAssessmentResult =
  | { ok: true; data: SubmitAssessmentSuccess }
  | { ok: false; error: SubmitAssessmentError }

function isLikertValue(value: unknown, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= max
}

function isMissingColumn(
  error: { message?: string; details?: string | null; hint?: string | null } | null | undefined,
  column: string
) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes(column) && (text.includes('column') || text.includes('schema'))
}

async function updateSubmissionOutputs(input: {
  adminClient: AdminClient
  submissionId: string
  updatedAt: string
  normalizedResponses: NumericResponseMap
  scores: Record<string, number>
  bands: Record<string, string>
  classification: Record<string, unknown>
  recommendations: string[]
  v2Artifacts?: V2SubmissionArtifacts | null
}) {
  const basePayload = {
    normalized_responses: input.normalizedResponses,
    scores: input.scores,
    bands: input.bands,
    classification: input.classification,
    recommendations: input.recommendations,
    updated_at: input.updatedAt,
  }

  if (!input.v2Artifacts) {
    const { error } = await input.adminClient
      .from('assessment_submissions')
      .update(basePayload)
      .eq('id', input.submissionId)

    return !error
  }

  const v2Payload = {
    ...basePayload,
    v2_runtime_metadata: input.v2Artifacts.metadata,
    v2_submission_result: input.v2Artifacts.scoring,
    v2_report_context: input.v2Artifacts.reportContext,
  }

  const primaryUpdate = await input.adminClient
    .from('assessment_submissions')
    .update(v2Payload)
    .eq('id', input.submissionId)

  if (!primaryUpdate.error) {
    return true
  }

  const missingArtifactColumns =
    isMissingColumn(primaryUpdate.error, 'v2_runtime_metadata')
    || isMissingColumn(primaryUpdate.error, 'v2_submission_result')
    || isMissingColumn(primaryUpdate.error, 'v2_report_context')

  if (!missingArtifactColumns) {
    return false
  }

  const fallbackUpdate = await input.adminClient
    .from('assessment_submissions')
    .update(basePayload)
    .eq('id', input.submissionId)

  return !fallbackUpdate.error
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
    if (!isLikertValue(raw, runtime.v2ScalePoints ?? 5)) {
      return { ok: false, error: 'invalid_responses' }
    }
  }

  const nowIso = new Date().toISOString()
  const firstName = params.invitation?.firstName ?? params.participant?.firstName ?? null
  const lastName = params.invitation?.lastName ?? params.participant?.lastName ?? null
  const email = params.invitation?.email ?? params.participant?.email ?? null
  const organisation = params.invitation?.organisation ?? params.participant?.organisation ?? null
  const role = params.invitation?.role ?? params.participant?.role ?? null
  const contactId = params.invitation?.contactId ?? params.participant?.contactId ?? null
  const consent = params.consent ?? true
  const participantRecord = await ensureAssessmentParticipant({
    client: params.adminClient,
    contactId,
    email,
    firstName,
    lastName,
    organisation,
    role,
  })
  const participantId = participantRecord.data?.id ?? null

  // Insert submission first, then compute/store engine outputs and patch the row.
  const { data: submissionRow, error: submissionInsertError } = await params.adminClient
    .from('assessment_submissions')
    .insert({
      assessment_id: runtime.id,
      invitation_id: params.invitation?.id ?? null,
      campaign_id: params.campaignId ?? null,
      participant_id: participantId,
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

  let scores: Record<string, number> = {}
  let bands: Record<string, string> = {}
  let classificationJson: Record<string, unknown> = {}
  let recommendations: string[] = []
  const reportAccessKind: SubmitAssessmentSuccess['reportAccessKind'] = 'assessment'
  const reportPath: SubmitAssessmentSuccess['reportPath'] = '/assess/r/assessment'
  let v2Artifacts: V2SubmissionArtifacts | null = null

  const v2QuestionBank = runtime.v2QuestionBank
  const v2ScoringConfig = runtime.v2ScoringConfig
  if (!v2QuestionBank || !v2ScoringConfig || runtime.runtimeVersion !== 'v2') {
    return { ok: false, error: 'submission_failed' }
  }

  v2Artifacts = buildV2SubmissionArtifacts({
    questionBank: v2QuestionBank,
    scoringConfig: v2ScoringConfig,
    responses: params.responses,
    participant: {
      firstName,
      lastName,
      organisation,
      role,
    },
    metadata: {
      assessmentVersion: runtime.version ?? 1,
      deliveryMode: 'live',
      runtimeSchemaVersion: 1,
      scoredAt: nowIso,
    },
  })

  for (const question of runtime.questions) {
    const value = v2Artifacts.scoring.normalizedResponses[question.questionKey]
    if (typeof value !== 'number') {
      return { ok: false, error: 'invalid_responses' }
    }
    normalizedResponses[question.questionKey] = value
  }

  scores = v2Artifacts.scoring.scores
  bands = v2Artifacts.scoring.bands
  classificationJson = v2Artifacts.scoring.classification
    ? {
        key: v2Artifacts.scoring.classification.key,
        label: v2Artifacts.scoring.classification.label,
        description: v2Artifacts.scoring.classification.description,
        source: 'v2',
      }
    : {}
  recommendations = v2Artifacts.scoring.recommendations

  const scoreUpdateOk = await updateSubmissionOutputs({
    adminClient: params.adminClient,
    submissionId: submissionRow.id,
    updatedAt: nowIso,
    normalizedResponses,
    scores,
    bands,
    classification: classificationJson,
    recommendations,
    v2Artifacts,
  })

  if (!scoreUpdateOk) {
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
      scores,
      bands,
      classification: 'label' in classificationJson && typeof classificationJson.label === 'string'
        ? {
            key: String(classificationJson.key ?? ''),
            label: String(classificationJson.label),
          }
        : null,
      recommendations,
      reportAccessKind,
      reportPath,
    },
  }
}
