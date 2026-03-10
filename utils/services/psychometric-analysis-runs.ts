import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { resolveNormGroupSubmissionIds } from '@/utils/assessments/norm-group-filters'
import {
  loadAssessmentPsychometricStructure,
  type PsychometricScale,
} from '@/utils/assessments/psychometric-structure'
import {
  validatePsychometrics,
} from '@/utils/psychometrics/validate-via-sidecar'
import type {
  PsychometricValidationRequest,
  PsychometricValidationResponse,
  ValidationFactorModel,
} from '@/utils/psychometrics/validation-contract'

type AdminClient = RouteAuthSuccess['adminClient']

type GroupingVariable = string | null

type AnalysisRunRow = {
  id: string
  assessment_id: string
  norm_group_id: string | null
  analysis_type: 'efa' | 'cfa' | 'invariance' | 'full_validation'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'approved' | 'superseded'
  grouping_variable: string | null
  sample_n: number
  minimum_sample_n: number | null
  input_snapshot: Record<string, unknown>
  summary: Record<string, unknown>
  warnings: Array<Record<string, unknown> | string>
  error_message: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  approved_at: string | null
}

type SubmissionRow = {
  id: string
  invitation_id: string | null
  campaign_id: string | null
  role: string | null
  demographics: Record<string, unknown> | null
  responses: Record<string, number> | null
}

function toScaleDefinition(scale: PsychometricScale) {
  return {
    key: scale.key,
    label: scale.label,
    source: scale.source,
    items: scale.items.map((item) => ({
      question_key: item.questionKey,
      text: item.text,
      weight: item.weight,
      reverse_scored: item.reverseScored,
    })),
  }
}

function getMinimumSampleN(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(25, Math.round(value)) : 150
}

function resolveDemographicGroupingValue(
  groupingVariable: string,
  demographics: Record<string, unknown> | null
) {
  const prefix = 'demographics.'
  if (!groupingVariable.startsWith(prefix)) return null
  const key = groupingVariable.slice(prefix.length)
  const value = demographics?.[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

async function resolveGroupingKeys(
  adminClient: AdminClient,
  groupingVariable: GroupingVariable,
  submissions: SubmissionRow[]
) {
  if (!groupingVariable) {
    return new Map<string, string | null>()
  }

  if (groupingVariable === 'campaign_id') {
    return new Map(submissions.map((submission) => [submission.id, submission.campaign_id ?? null]))
  }

  if (groupingVariable === 'role') {
    return new Map(submissions.map((submission) => [submission.id, submission.role ?? null]))
  }

  if (groupingVariable.startsWith('demographics.')) {
    return new Map(
      submissions.map((submission) => [
        submission.id,
        resolveDemographicGroupingValue(groupingVariable, submission.demographics),
      ])
    )
  }

  if (groupingVariable === 'cohort_id') {
    const invitationIds = submissions
      .map((submission) => submission.invitation_id)
      .filter((value): value is string => Boolean(value))

    if (invitationIds.length === 0) {
      return new Map<string, string | null>()
    }

    const { data, error } = await adminClient
      .from('assessment_invitations')
      .select('id, cohort_id')
      .in('id', invitationIds)

    if (error) {
      throw new Error('cohort_lookup_failed')
    }

    const invitationMap = new Map(
      (data ?? []).map((row) => [row.id as string, (row.cohort_id as string | null) ?? null])
    )
    return new Map(
      submissions.map((submission) => [
        submission.id,
        submission.invitation_id ? (invitationMap.get(submission.invitation_id) ?? null) : null,
      ])
    )
  }

  return new Map<string, string | null>()
}

async function buildValidationRequest(input: {
  adminClient: AdminClient
  run: AnalysisRunRow
}): Promise<{ request: PsychometricValidationRequest; sampleN: number }> {
  const structure = await loadAssessmentPsychometricStructure(
    input.adminClient,
    input.run.assessment_id
  )

  const normFilters =
    input.run.norm_group_id
      ? (
          await input.adminClient
            .from('norm_groups')
            .select('filters')
            .eq('id', input.run.norm_group_id)
            .maybeSingle()
        ).data?.filters
      : null

  const submissionMatchResult = await resolveNormGroupSubmissionIds({
    adminClient: input.adminClient,
    assessmentId: input.run.assessment_id,
    filters: normFilters as Record<string, unknown> | null | undefined,
  })

  if (!submissionMatchResult.ok) {
    throw new Error(submissionMatchResult.error)
  }

  const submissionIds = submissionMatchResult.data.submissionIds
  if (submissionIds.length === 0) {
    throw new Error('insufficient_sample')
  }

  const { data: submissionRows, error: submissionError } = await input.adminClient
    .from('assessment_submissions')
    .select('id, invitation_id, campaign_id, role, demographics, responses')
    .eq('assessment_id', input.run.assessment_id)
    .in('id', submissionIds)

  if (submissionError) {
    throw new Error('submission_fetch_failed')
  }

  const submissions = (submissionRows ?? []) as SubmissionRow[]
  const groupingKeys = await resolveGroupingKeys(
    input.adminClient,
    input.run.grouping_variable,
    submissions
  )

  const questionKeys = Array.from(
    new Set(
      [...structure.primaryScales, ...structure.legacyScales].flatMap((scale) =>
        scale.items.map((item) => item.questionKey)
      )
    )
  )

  const respondents = submissions.map((submission) => ({
    submission_id: submission.id,
    group_key: groupingKeys.get(submission.id) ?? null,
    responses: Object.fromEntries(
      questionKeys.map((questionKey) => {
        const raw = submission.responses?.[questionKey]
        return [
          questionKey,
          typeof raw === 'number' && Number.isFinite(raw) ? raw : null,
        ]
      })
    ),
  }))

  const sampleN = respondents.length
  if (sampleN < getMinimumSampleN(input.run.minimum_sample_n)) {
    throw new Error('insufficient_sample')
  }

  return {
    sampleN,
    request: {
      analysis_type: input.run.analysis_type,
      assessment_id: input.run.assessment_id,
      grouping_variable: input.run.grouping_variable,
      minimum_sample_n: getMinimumSampleN(input.run.minimum_sample_n),
      primary_scales: structure.primaryScales.map(toScaleDefinition),
      legacy_scales: structure.legacyScales.map(toScaleDefinition),
      respondents,
    },
  }
}

async function clearRunArtifacts(adminClient: AdminClient, runId: string) {
  await adminClient.from('psychometric_model_recommendations').delete().eq('analysis_run_id', runId)
  await adminClient.from('psychometric_item_diagnostics').delete().eq('analysis_run_id', runId)
  await adminClient.from('psychometric_scale_diagnostics').delete().eq('analysis_run_id', runId)
  await adminClient.from('psychometric_factor_models').delete().eq('analysis_run_id', runId)
}

async function persistFactorModels(input: {
  adminClient: AdminClient
  runId: string
  questionIdByKey: Map<string, string>
  models: ValidationFactorModel[]
}) {
  for (const model of input.models) {
    const { data, error } = await input.adminClient
      .from('psychometric_factor_models')
      .insert({
        analysis_run_id: input.runId,
        model_kind: model.model_kind,
        model_name: model.model_name,
        factor_count: model.factor_count,
        rotation: model.rotation ?? null,
        extraction_method: model.extraction_method ?? null,
        grouping_variable: model.grouping_variable ?? null,
        group_key: model.group_key ?? null,
        adequacy: model.adequacy ?? {},
        fit_indices: model.fit_indices ?? {},
        factor_correlations: model.factor_correlations ?? {},
        summary: model.summary ?? {},
      })
      .select('id')
      .single()

    if (error || !data?.id || !model.loadings || model.loadings.length === 0) {
      continue
    }

    await input.adminClient.from('psychometric_factor_loadings').insert(
      model.loadings.map((loading) => ({
        factor_model_id: data.id,
        scale_key: loading.scale_key,
        question_id: input.questionIdByKey.get(loading.question_key) ?? null,
        question_key: loading.question_key,
        factor_key: loading.factor_key,
        loading: loading.loading,
        standardized_loading: loading.standardized_loading,
        communality: loading.communality,
        uniqueness: loading.uniqueness,
        cross_loading: loading.cross_loading,
        retained: loading.retained,
        metadata: loading.metadata ?? {},
      }))
    )
  }
}

async function persistValidationArtifacts(input: {
  adminClient: AdminClient
  runId: string
  assessmentId: string
  payload: PsychometricValidationResponse
}) {
  const structure = await loadAssessmentPsychometricStructure(input.adminClient, input.assessmentId)
  const questionIdByKey = new Map(
    structure.questions.map((question) => [question.questionKey, question.id])
  )

  await clearRunArtifacts(input.adminClient, input.runId)

  if (input.payload.scale_diagnostics.length > 0) {
    await input.adminClient.from('psychometric_scale_diagnostics').insert(
      input.payload.scale_diagnostics.map((diagnostic) => ({
        analysis_run_id: input.runId,
        scale_key: diagnostic.scale_key,
        scale_label: diagnostic.scale_label,
        source: diagnostic.source,
        item_count: diagnostic.item_count,
        complete_n: diagnostic.complete_n,
        alpha: diagnostic.alpha,
        alpha_ci_lower: diagnostic.alpha_ci_lower,
        alpha_ci_upper: diagnostic.alpha_ci_upper,
        sem: diagnostic.sem,
        missing_rate: diagnostic.missing_rate,
        metadata: diagnostic.metadata ?? {},
      }))
    )
  }

  if (input.payload.item_diagnostics.length > 0) {
    await input.adminClient.from('psychometric_item_diagnostics').insert(
      input.payload.item_diagnostics.map((diagnostic) => ({
        analysis_run_id: input.runId,
        scale_key: diagnostic.scale_key,
        question_id: questionIdByKey.get(diagnostic.question_key) ?? null,
        question_key: diagnostic.question_key,
        item_label: diagnostic.item_label,
        source: diagnostic.source,
        reverse_scored: diagnostic.reverse_scored,
        mean: diagnostic.mean,
        sd: diagnostic.sd,
        missing_rate: diagnostic.missing_rate,
        floor_pct: diagnostic.floor_pct,
        ceiling_pct: diagnostic.ceiling_pct,
        citc: diagnostic.citc,
        alpha_if_deleted: diagnostic.alpha_if_deleted,
        metadata: diagnostic.metadata ?? {},
      }))
    )
  }

  await persistFactorModels({
    adminClient: input.adminClient,
    runId: input.runId,
    questionIdByKey,
    models: [
      ...input.payload.efa_models,
      ...input.payload.cfa_models,
      ...input.payload.invariance_results,
    ],
  })

  if (input.payload.recommendations.length > 0) {
    await input.adminClient.from('psychometric_model_recommendations').insert(
      input.payload.recommendations.map((recommendation) => ({
        analysis_run_id: input.runId,
        scope: recommendation.scope,
        target_key: recommendation.target_key ?? null,
        severity: recommendation.severity,
        code: recommendation.code,
        message: recommendation.message,
        metadata: recommendation.metadata ?? {},
      }))
    )
  }
}

async function claimRun(adminClient: AdminClient, runId: string) {
  const { data } = await adminClient
    .from('psychometric_analysis_runs')
    .update({
      status: 'running',
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('status', 'queued')
    .select('id')
    .maybeSingle()

  return data ?? null
}

async function markRunFailed(adminClient: AdminClient, runId: string, message: string) {
  await adminClient
    .from('psychometric_analysis_runs')
    .update({
      status: 'failed',
      error_message: message,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
}

export async function createPsychometricAnalysisRun(input: {
  adminClient: AdminClient
  assessmentId: string
  requestedBy?: string | null
  payload: {
    analysisType?: 'efa' | 'cfa' | 'invariance' | 'full_validation'
    normGroupId?: string | null
    groupingVariable?: string | null
    minimumSampleN?: number | null
  } | null
}) {
  const structure = await loadAssessmentPsychometricStructure(input.adminClient, input.assessmentId)
  if (structure.primaryScales.length === 0) {
    return { ok: false as const, error: 'no_scales_configured' as const }
  }

  const analysisType = input.payload?.analysisType ?? 'full_validation'
  const groupingVariable = input.payload?.groupingVariable?.trim() || null
  const minimumSampleN = getMinimumSampleN(input.payload?.minimumSampleN)

  // Check each scale has at least 3 items; collect warnings
  const preflightWarnings: string[] = []
  for (const scale of structure.primaryScales) {
    if (scale.items.length < 3) {
      preflightWarnings.push(`Scale "${scale.label}" has only ${scale.items.length} item(s). EFA requires at least 3 items per scale for stable factor estimation.`)
    }
  }

  const inputSnapshot = {
    generated_at: new Date().toISOString(),
    has_trait_scales: structure.hasTraitScales,
    primary_scale_keys: structure.primaryScales.map((scale) => scale.key),
    legacy_scale_keys: structure.legacyScales.map((scale) => scale.key),
    warning_count: structure.warnings.length,
    grouping_variable: groupingVariable,
    minimum_sample_n: minimumSampleN,
    norm_group_id: input.payload?.normGroupId ?? null,
    preflight_warnings: preflightWarnings,
  }

  const { data, error } = await input.adminClient
    .from('psychometric_analysis_runs')
    .insert({
      assessment_id: input.assessmentId,
      norm_group_id: input.payload?.normGroupId ?? null,
      analysis_type: analysisType,
      status: 'queued',
      grouping_variable: groupingVariable,
      minimum_sample_n: minimumSampleN,
      input_snapshot: inputSnapshot,
      requested_by: input.requestedBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('id, assessment_id, norm_group_id, analysis_type, status, grouping_variable, sample_n, minimum_sample_n, input_snapshot, summary, warnings, error_message, created_at, updated_at, completed_at, approved_at')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'analysis_run_create_failed' as const }
  }

  return { ok: true as const, data: { run: data as AnalysisRunRow } }
}

export async function listPsychometricAnalysisRuns(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data, error } = await input.adminClient
    .from('psychometric_analysis_runs')
    .select('id, assessment_id, norm_group_id, analysis_type, status, grouping_variable, sample_n, minimum_sample_n, input_snapshot, summary, warnings, error_message, created_at, updated_at, completed_at, approved_at')
    .eq('assessment_id', input.assessmentId)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false as const, error: 'analysis_runs_fetch_failed' as const }
  }

  return { ok: true as const, data: { runs: (data ?? []) as AnalysisRunRow[] } }
}

export async function getPsychometricAnalysisRunDetail(input: {
  adminClient: AdminClient
  assessmentId: string
  runId: string
}) {
  const [runResult, scalesResult, itemsResult, modelsResult, loadingsResult, recommendationsResult] =
    await Promise.all([
      input.adminClient
        .from('psychometric_analysis_runs')
        .select('id, assessment_id, norm_group_id, analysis_type, status, grouping_variable, sample_n, minimum_sample_n, input_snapshot, summary, warnings, error_message, created_at, updated_at, completed_at, approved_at')
        .eq('id', input.runId)
        .eq('assessment_id', input.assessmentId)
        .maybeSingle(),
      input.adminClient
        .from('psychometric_scale_diagnostics')
        .select('*')
        .eq('analysis_run_id', input.runId),
      input.adminClient
        .from('psychometric_item_diagnostics')
        .select('*')
        .eq('analysis_run_id', input.runId),
      input.adminClient
        .from('psychometric_factor_models')
        .select('*')
        .eq('analysis_run_id', input.runId),
      input.adminClient
        .from('psychometric_factor_loadings')
        .select('*, psychometric_factor_models!inner(analysis_run_id)')
        .eq('psychometric_factor_models.analysis_run_id', input.runId),
      input.adminClient
        .from('psychometric_model_recommendations')
        .select('*')
        .eq('analysis_run_id', input.runId),
    ])

  if (runResult.error || !runResult.data) {
    return { ok: false as const, error: 'analysis_run_not_found' as const }
  }

  return {
    ok: true as const,
    data: {
      run: runResult.data as AnalysisRunRow,
      scaleDiagnostics: scalesResult.data ?? [],
      itemDiagnostics: itemsResult.data ?? [],
      factorModels: modelsResult.data ?? [],
      factorLoadings: loadingsResult.data ?? [],
      recommendations: recommendationsResult.data ?? [],
    },
  }
}

export async function approvePsychometricAnalysisRun(input: {
  adminClient: AdminClient
  assessmentId: string
  runId: string
  approvedBy?: string | null
}) {
  const { data: run, error } = await input.adminClient
    .from('psychometric_analysis_runs')
    .select('id, status')
    .eq('id', input.runId)
    .eq('assessment_id', input.assessmentId)
    .maybeSingle()

  if (error || !run) {
    return { ok: false as const, error: 'analysis_run_not_found' as const }
  }

  if (run.status !== 'completed' && run.status !== 'approved') {
    return { ok: false as const, error: 'analysis_run_not_ready' as const }
  }

  const approvedAt = new Date().toISOString()
  await input.adminClient
    .from('psychometric_analysis_runs')
    .update({
      status: 'approved',
      approved_by: input.approvedBy ?? null,
      approved_at: approvedAt,
      updated_at: approvedAt,
    })
    .eq('id', input.runId)

  await input.adminClient
    .from('assessments')
    .update({
      approved_analysis_run_id: input.runId,
      updated_at: approvedAt,
    })
    .eq('id', input.assessmentId)

  // Supersede all other approved runs for this assessment
  await input.adminClient
    .from('psychometric_analysis_runs')
    .update({
      status: 'superseded',
      updated_at: approvedAt,
    })
    .eq('assessment_id', input.assessmentId)
    .eq('status', 'approved')
    .neq('id', input.runId)

  return { ok: true as const }
}

export async function computeValidationStage(
  adminClient: AdminClient,
  assessmentId: string
): Promise<'pilot' | 'analysis' | 'certified' | 'review'> {
  const [normGroupResult, runsResult] = await Promise.all([
    adminClient
      .from('norm_groups')
      .select('id, n, is_global')
      .eq('assessment_id', assessmentId)
      .eq('is_global', true)
      .maybeSingle(),
    adminClient
      .from('psychometric_analysis_runs')
      .select('id, status, approved_at, sample_n, summary')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false }),
  ])

  const normGroup = normGroupResult.data
  const runs = (runsResult.data ?? []) as AnalysisRunRow[]

  const approvedRun = runs.find((r) => r.status === 'approved')
  const hasCompletedRun = runs.some((r) => r.status === 'completed' || r.status === 'approved')
  const normN = normGroup?.n ?? 0

  if (approvedRun) {
    // Check if certified
    const runN = approvedRun.sample_n ?? 0
    const summary = (approvedRun.summary ?? {}) as Record<string, unknown>
    const allScalesReliable = !summary.scale_diagnostics ||
      (summary.scale_diagnostics as Array<{ alpha?: number }>).every((sd) => (sd.alpha ?? 0) >= 0.70)

    if (normN >= 200 && runN >= 200 && allScalesReliable) {
      return 'certified'
    }
    return 'analysis'
  }

  if (hasCompletedRun && normN >= 50) {
    return 'analysis'
  }

  return 'pilot'
}

export async function processPendingPsychometricAnalysisRuns(input: {
  adminClient: AdminClient
  batchSize?: number
}) {
  const { data, error } = await input.adminClient
    .from('psychometric_analysis_runs')
    .select('id, assessment_id, norm_group_id, analysis_type, status, grouping_variable, sample_n, minimum_sample_n, input_snapshot, summary, warnings, error_message, created_at, updated_at, completed_at, approved_at')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(input.batchSize ?? 5)

  if (error) {
    return { ok: false as const, error: 'analysis_run_fetch_failed' as const }
  }

  let completed = 0
  let failed = 0
  let skipped = 0

  for (const rawRun of (data ?? []) as AnalysisRunRow[]) {
    const claimed = await claimRun(input.adminClient, rawRun.id)
    if (!claimed) {
      skipped += 1
      continue
    }

    try {
      const { request, sampleN } = await buildValidationRequest({
        adminClient: input.adminClient,
        run: rawRun,
      })

      const response = await validatePsychometrics(request)
      await persistValidationArtifacts({
        adminClient: input.adminClient,
        runId: rawRun.id,
        assessmentId: rawRun.assessment_id,
        payload: response,
      })

      await input.adminClient
        .from('psychometric_analysis_runs')
        .update({
          status: 'completed',
          sample_n: sampleN,
          summary: response.summary,
          warnings: response.warnings,
          error_message: null,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq('id', rawRun.id)

      completed += 1
    } catch (runError) {
      await markRunFailed(
        input.adminClient,
        rawRun.id,
        runError instanceof Error ? runError.message : 'analysis_run_failed'
      )
      failed += 1
    }
  }

  return {
    ok: true as const,
    data: {
      fetched: (data ?? []).length,
      completed,
      failed,
      skipped,
    },
  }
}
