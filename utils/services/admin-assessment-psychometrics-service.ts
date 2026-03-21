import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { resolveNormGroupSubmissionIds } from '@/utils/assessments/norm-group-filters'
import {
  buildV2PsychometricStructure,
  computeV2Diagnostics,
  computeTraitNormStats,
} from '@/utils/assessments/assessment-psychometric-structure'
import {
  createEmptyV2PsychometricsConfig,
  normalizeV2PsychometricsConfig,
  type V2PsychometricsConfig,
} from '@/utils/assessments/assessment-psychometrics'
import { normalizeQuestionBank } from '@/utils/assessments/assessment-question-bank'
import { normalizeV2ScoringConfig } from '@/utils/assessments/assessment-scoring'
import { validatePsychometrics } from '@/utils/psychometrics/validate-via-sidecar'

type AdminClient = RouteAuthSuccess['adminClient']

type AssessmentV2Record = {
  id: string
  v2_question_bank?: unknown
  v2_scoring_config?: unknown
  v2_psychometrics_config?: unknown
  report_config?: unknown
}

function isMissingV2Column(error: { message?: string; details?: string | null; hint?: string | null } | null | undefined, column: string) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes(column) && (text.includes('column') || text.includes('schema cache'))
}

async function loadAssessmentV2Record(adminClient: AdminClient, assessmentId: string) {
  const primary = await adminClient
    .from('assessments')
    .select('id, v2_question_bank, v2_scoring_config, v2_psychometrics_config, report_config')
    .eq('id', assessmentId)
    .maybeSingle()

  const missingAnyColumn = primary.error
    && (
      isMissingV2Column(primary.error, 'v2_question_bank')
      || isMissingV2Column(primary.error, 'v2_scoring_config')
      || isMissingV2Column(primary.error, 'v2_psychometrics_config')
    )

  if (!missingAnyColumn) {
    return primary as { data: AssessmentV2Record | null; error: typeof primary.error }
  }

  const fallback = await adminClient
    .from('assessments')
    .select('id, report_config')
    .eq('id', assessmentId)
    .maybeSingle()

  if (fallback.error || !fallback.data) {
    return fallback
  }

  const reportConfig = (fallback.data.report_config ?? {}) as Record<string, unknown>
  return {
    data: {
      id: fallback.data.id,
      report_config: fallback.data.report_config,
      v2_question_bank: reportConfig.v2_question_bank ?? null,
      v2_scoring_config: reportConfig.v2_scoring_config ?? null,
      v2_psychometrics_config: reportConfig.v2_psychometrics_config ?? null,
    } satisfies AssessmentV2Record,
    error: null,
  }
}

function getV2ConfigValue(record: unknown, key: 'v2_question_bank' | 'v2_scoring_config' | 'v2_psychometrics_config') {
  if (!record || typeof record !== 'object') return null
  if (key in record) {
    return (record as Record<string, unknown>)[key] ?? null
  }

  const reportConfig = (record as { report_config?: unknown }).report_config
  if (reportConfig && typeof reportConfig === 'object' && key in (reportConfig as Record<string, unknown>)) {
    return (reportConfig as Record<string, unknown>)[key] ?? null
  }

  return null
}

async function saveAssessmentV2PsychometricsRecord(input: {
  adminClient: AdminClient
  assessmentId: string
  config: V2PsychometricsConfig
}) {
  const primary = await input.adminClient
    .from('assessments')
    .update({
      v2_psychometrics_config: input.config,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
    .select('id, v2_psychometrics_config, report_config')
    .maybeSingle()

  if (!primary.error && primary.data) {
    return { ok: true as const, data: normalizeV2PsychometricsConfig(primary.data.v2_psychometrics_config) }
  }

  if (!isMissingV2Column(primary.error, 'v2_psychometrics_config')) {
    return { ok: false as const, error: 'psychometrics_config_save_failed' as const, message: primary.error?.message }
  }

  const current = await input.adminClient
    .from('assessments')
    .select('id, report_config')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (current.error || !current.data) {
    return { ok: false as const, error: 'psychometrics_config_save_failed' as const, message: current.error?.message }
  }

  const reportConfig = (current.data.report_config ?? {}) as Record<string, unknown>
  const fallback = await input.adminClient
    .from('assessments')
    .update({
      report_config: {
        ...reportConfig,
        v2_psychometrics_config: input.config,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
    .select('report_config')
    .maybeSingle()

  if (fallback.error || !fallback.data) {
    return { ok: false as const, error: 'psychometrics_config_save_failed' as const, message: fallback.error?.message }
  }

  const nextReportConfig = (fallback.data.report_config ?? {}) as Record<string, unknown>
  return {
    ok: true as const,
    data: normalizeV2PsychometricsConfig(nextReportConfig.v2_psychometrics_config),
  }
}

async function loadResponses(adminClient: AdminClient, assessmentId: string, submissionIds?: string[]) {
  let query = adminClient
    .from('assessment_submissions')
    .select('id, invitation_id, campaign_id, role, demographics, responses')
    .eq('assessment_id', assessmentId)
    .eq('excluded_from_analysis', false)

  if (submissionIds && submissionIds.length > 0) {
    query = query.in('id', submissionIds)
  }

  const result = await query
  return (result.data ?? []) as Array<{
    id: string
    invitation_id: string | null
    campaign_id: string | null
    role: string | null
    demographics: Record<string, unknown> | null
    responses: Record<string, number> | null
  }>
}

function getGroupingKey(
  groupingVariable: string | null,
  submission: {
    invitation_id: string | null
    campaign_id: string | null
    role: string | null
    demographics: Record<string, unknown> | null
  }
) {
  if (!groupingVariable) return null
  if (groupingVariable === 'campaign_id') return submission.campaign_id ?? null
  if (groupingVariable === 'role') return submission.role ?? null
  if (groupingVariable.startsWith('demographics.')) {
    const key = groupingVariable.slice('demographics.'.length)
    const value = submission.demographics?.[key]
    return typeof value === 'string' ? value : null
  }
  return null
}

export async function getAdminAssessmentV2PsychometricsWorkspace(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data, error } = await loadAssessmentV2Record(input.adminClient, input.assessmentId)
  if (error || !data) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const questionBank = normalizeQuestionBank(getV2ConfigValue(data, 'v2_question_bank'))
  const scoringConfig = normalizeV2ScoringConfig(getV2ConfigValue(data, 'v2_scoring_config'))
  const psychometricsConfig = normalizeV2PsychometricsConfig(
    getV2ConfigValue(data, 'v2_psychometrics_config') ?? createEmptyV2PsychometricsConfig()
  )
  const structure = buildV2PsychometricStructure(questionBank)
  const submissions = await loadResponses(input.adminClient, input.assessmentId)
  const responseMaps = submissions.map((submission) => submission.responses ?? {})
  const diagnostics = computeV2Diagnostics({
    structure,
    responseMaps,
  })

  const referenceGroups = await Promise.all(
    psychometricsConfig.referenceGroups.map(async (group) => {
      const match = group.useEveryone
        ? { ok: true as const, data: { submissionIds: submissions.map((submission) => submission.id) } }
        : await resolveNormGroupSubmissionIds({
            adminClient: input.adminClient,
            assessmentId: input.assessmentId,
            filters: group.filters,
          })

      return {
        ...group,
        matchedSubmissionCount: match.ok ? match.data.submissionIds.length : group.matchedSubmissionCount,
      }
    })
  )

  return {
    ok: true as const,
    data: {
      psychometricsConfig: {
        ...psychometricsConfig,
        referenceGroups,
      },
      structure,
      diagnostics,
      summary: {
        totalResponses: submissions.length,
        scaleCount: structure.primaryScales.length,
        itemCount: questionBank.scoredItems.length,
        reverseCodedCount: questionBank.scoredItems.filter((item) => item.isReverseCoded).length,
        warningCount: structure.warnings.length,
      },
    },
  }
}

export async function saveAdminAssessmentV2PsychometricsConfig(input: {
  adminClient: AdminClient
  assessmentId: string
  psychometricsConfig: unknown
}) {
  const normalized = normalizeV2PsychometricsConfig(input.psychometricsConfig)
  return saveAssessmentV2PsychometricsRecord({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    config: normalized,
  })
}

export async function computeAdminAssessmentV2ReferenceGroup(input: {
  adminClient: AdminClient
  assessmentId: string
  groupId: string
}) {
  const { data, error } = await loadAssessmentV2Record(input.adminClient, input.assessmentId)
  if (error || !data) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const questionBank = normalizeQuestionBank(getV2ConfigValue(data, 'v2_question_bank'))
  const scoringConfig = normalizeV2ScoringConfig(getV2ConfigValue(data, 'v2_scoring_config'))
  const psychometricsConfig = normalizeV2PsychometricsConfig(getV2ConfigValue(data, 'v2_psychometrics_config'))
  const structure = buildV2PsychometricStructure(questionBank)
  const group = psychometricsConfig.referenceGroups.find((entry) => entry.id === input.groupId)
  if (!group) {
    return { ok: false as const, error: 'reference_group_not_found' as const }
  }

  const match = group.useEveryone
    ? { ok: true as const, data: { submissionIds: undefined as string[] | undefined } }
    : await resolveNormGroupSubmissionIds({
        adminClient: input.adminClient,
        assessmentId: input.assessmentId,
        filters: group.filters,
      })

  if (!match.ok) {
    return { ok: false as const, error: match.error }
  }

  const submissions = await loadResponses(input.adminClient, input.assessmentId, match.data.submissionIds)
  const traitStats = computeTraitNormStats({
    structure,
    questionBank,
    scoringConfig,
    responseMaps: submissions.map((submission) => submission.responses ?? {}),
  })

  const nextConfig = normalizeV2PsychometricsConfig({
    ...psychometricsConfig,
    referenceGroups: psychometricsConfig.referenceGroups.map((entry) =>
      entry.id === input.groupId
        ? {
            ...entry,
            matchedSubmissionCount: submissions.length,
            lastComputedAt: new Date().toISOString(),
            traitStats,
          }
        : entry
    ),
  })

  const saved = await saveAssessmentV2PsychometricsRecord({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    config: nextConfig,
  })

  if (!saved.ok) return saved
  return {
    ok: true as const,
    data: {
      psychometricsConfig: saved.data,
    },
  }
}

export async function runAdminAssessmentV2Validation(input: {
  adminClient: AdminClient
  assessmentId: string
  payload: {
    analysisType?: 'efa' | 'cfa' | 'invariance' | 'full_validation'
    normGroupId?: string | null
    groupingVariable?: string | null
    minimumSampleN?: number | null
  } | null
}) {
  const { data, error } = await loadAssessmentV2Record(input.adminClient, input.assessmentId)
  if (error || !data) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const questionBank = normalizeQuestionBank(getV2ConfigValue(data, 'v2_question_bank'))
  const psychometricsConfig = normalizeV2PsychometricsConfig(getV2ConfigValue(data, 'v2_psychometrics_config'))
  const structure = buildV2PsychometricStructure(questionBank)
  if (structure.primaryScales.length === 0) {
    return { ok: false as const, error: 'no_scales_configured' as const }
  }

  const analysisType = input.payload?.analysisType ?? 'full_validation'
  const groupingVariable = input.payload?.groupingVariable?.trim() || null
  const minimumSampleN = Math.max(25, Math.round(input.payload?.minimumSampleN ?? 150))
  const normGroupId = input.payload?.normGroupId?.trim() || null

  const targetGroup = normGroupId
    ? psychometricsConfig.referenceGroups.find((entry) => entry.id === normGroupId) ?? null
    : null

  if (normGroupId && !targetGroup) {
    return { ok: false as const, error: 'reference_group_not_found' as const }
  }

  const match = targetGroup && !targetGroup.useEveryone
    ? await resolveNormGroupSubmissionIds({
        adminClient: input.adminClient,
        assessmentId: input.assessmentId,
        filters: targetGroup.filters,
      })
    : { ok: true as const, data: { submissionIds: undefined as string[] | undefined } }

  if (!match.ok) {
    return { ok: false as const, error: match.error }
  }

  const submissions = await loadResponses(input.adminClient, input.assessmentId, match.data.submissionIds)
  if (submissions.length < minimumSampleN) {
    return { ok: false as const, error: 'insufficient_sample' as const, sampleN: submissions.length }
  }

  const questionKeys = Array.from(
    new Set(structure.primaryScales.flatMap((scale) => scale.items.map((item) => item.questionKey)))
  )

  const response = await validatePsychometrics({
    analysis_type: analysisType,
    assessment_id: input.assessmentId,
    grouping_variable: groupingVariable,
    minimum_sample_n: minimumSampleN,
    primary_scales: structure.primaryScales.map((scale) => ({
      key: scale.key,
      label: scale.label,
      source: 'trait_mapped' as const,
      items: scale.items.map((item) => ({
        question_key: item.questionKey,
        text: item.text,
        weight: item.weight,
        reverse_scored: item.reverseScored,
      })),
    })),
    legacy_scales: [],
    respondents: submissions.map((submission) => ({
      submission_id: submission.id,
      group_key: getGroupingKey(groupingVariable, submission),
      responses: Object.fromEntries(
        questionKeys.map((questionKey) => {
          const raw = submission.responses?.[questionKey]
          return [questionKey, typeof raw === 'number' && Number.isFinite(raw) ? raw : null]
        })
      ),
    })),
  })

  const run = {
    id: crypto.randomUUID(),
    analysisType,
    normGroupId,
    groupingVariable,
    minimumSampleN,
    sampleN: submissions.length,
    status: 'completed' as const,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    summary: response.summary,
    warnings: response.warnings.map((warning) => typeof warning === 'string' ? warning : JSON.stringify(warning)),
    errorMessage: null,
    scaleDiagnostics: response.scale_diagnostics,
    itemDiagnostics: response.item_diagnostics,
    factorModels: [...response.efa_models, ...response.cfa_models, ...response.invariance_results],
    recommendations: response.recommendations,
  }

  const nextConfig = normalizeV2PsychometricsConfig({
    ...psychometricsConfig,
    validationRuns: [run, ...psychometricsConfig.validationRuns].slice(0, 10),
  })

  const saved = await saveAssessmentV2PsychometricsRecord({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    config: nextConfig,
  })

  if (!saved.ok) return saved
  return {
    ok: true as const,
    data: {
      psychometricsConfig: saved.data,
      run,
    },
  }
}
