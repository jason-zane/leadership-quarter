import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  buildScoringModelOutputSummary,
  getDefaultScoringModelName,
  normalizeScoringModelConfig,
  normalizeScoringModelMode,
  normalizeScoringModelStatus,
  toScoringModelKey,
  type AssessmentScoringModelMode,
  type AssessmentScoringModelRecord,
} from '@/utils/assessments/scoring-models'
import { createEmptyScoringConfig } from '@/utils/assessments/scoring-config'

type AdminClient = RouteAuthSuccess['adminClient']

type AssessmentScoringSeedContext = {
  id: string
  scoring_engine: unknown
  scoring_config: unknown
  created_by: string | null
}

async function getAssessmentSeedContext(adminClient: AdminClient, assessmentId: string) {
  const { data, error } = await adminClient
    .from('assessments')
    .select('id, scoring_engine, scoring_config, created_by')
    .eq('id', assessmentId)
    .maybeSingle()

  if (error || !data?.id) {
    return null
  }

  return data as AssessmentScoringSeedContext
}

export async function ensureSeededAssessmentScoringModels(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data: existingRows, error: existingError } = await input.adminClient
    .from('assessment_scoring_models')
    .select('id')
    .eq('assessment_id', input.assessmentId)
    .limit(1)

  if (existingError || (existingRows ?? []).length > 0) {
    return { created: false as const }
  }

  const assessment = await getAssessmentSeedContext(input.adminClient, input.assessmentId)
  if (!assessment) {
    return { created: false as const }
  }

  const mode = normalizeScoringModelMode(assessment.scoring_engine)
  const config = normalizeScoringModelConfig(assessment.scoring_config)
  const nowIso = new Date().toISOString()

  const { error } = await input.adminClient
    .from('assessment_scoring_models')
    .insert({
      assessment_id: input.assessmentId,
      model_key: 'core_scoring_model',
      name: getDefaultScoringModelName(mode),
      mode,
      status: config.dimensions.length > 0 ? 'published' : 'draft',
      is_default: true,
      config,
      output_summary: buildScoringModelOutputSummary(config),
      created_by: assessment.created_by,
      updated_at: nowIso,
    })

  return {
    created: !error,
  }
}

export async function listAdminScoringModels(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  await ensureSeededAssessmentScoringModels(input)

  const { data: assessment, error: assessmentError } = await input.adminClient
    .from('assessments')
    .select('id, key, name, scoring_engine, scoring_config')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (assessmentError || !assessment) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const { data: models, error: modelsError } = await input.adminClient
    .from('assessment_scoring_models')
    .select('id, assessment_id, model_key, name, mode, status, is_default, config, output_summary, created_by, created_at, updated_at')
    .eq('assessment_id', input.assessmentId)
    .order('is_default', { ascending: false })
    .order('name')

  if (modelsError) {
    return { ok: false as const, error: 'scoring_models_list_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      assessment,
      models: (models ?? []) as AssessmentScoringModelRecord[],
    },
  }
}

async function syncAssessmentDefaultModel(input: {
  adminClient: AdminClient
  assessmentId: string
  mode: AssessmentScoringModelMode
  config: unknown
}) {
  const normalizedMode = normalizeScoringModelMode(input.mode)
  const normalizedConfig = normalizeScoringModelConfig(input.config)

  await input.adminClient
    .from('assessments')
    .update({
      scoring_engine: normalizedMode,
      scoring_config: normalizedConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
}

async function syncReportVariantsForScoringModel(input: {
  adminClient: AdminClient
  assessmentId: string
  scoringModelId: string
  config: unknown
}) {
  await input.adminClient
    .from('assessment_report_variants')
    .update({
      scoring_config: normalizeScoringModelConfig(input.config),
      updated_at: new Date().toISOString(),
    })
    .eq('assessment_id', input.assessmentId)
    .eq('scoring_model_id', input.scoringModelId)
}

export async function setAssessmentDefaultScoringModelConfig(input: {
  adminClient: AdminClient
  assessmentId: string
  config: unknown
  mode?: AssessmentScoringModelMode
}) {
  await ensureSeededAssessmentScoringModels(input)

  const { data: currentDefault } = await input.adminClient
    .from('assessment_scoring_models')
    .select('id, mode')
    .eq('assessment_id', input.assessmentId)
    .eq('is_default', true)
    .limit(1)
    .maybeSingle()

  const normalizedConfig = normalizeScoringModelConfig(input.config)
  const mode = normalizeScoringModelMode(input.mode ?? currentDefault?.mode)
  const outputSummary = buildScoringModelOutputSummary(normalizedConfig)

  if (currentDefault?.id) {
    await input.adminClient
      .from('assessment_scoring_models')
      .update({
        mode,
        config: normalizedConfig,
        output_summary: outputSummary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentDefault.id)
      .eq('assessment_id', input.assessmentId)

    await syncReportVariantsForScoringModel({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      scoringModelId: currentDefault.id,
      config: normalizedConfig,
    })
  }

  await syncAssessmentDefaultModel({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    mode,
    config: normalizedConfig,
  })

  return {
    mode,
    config: normalizedConfig,
    outputSummary,
  }
}

export async function getAssessmentScoringModel(input: {
  adminClient: AdminClient
  assessmentId: string
  scoringModelId?: string | null
}) {
  await ensureSeededAssessmentScoringModels(input)

  let query = input.adminClient
    .from('assessment_scoring_models')
    .select('id, assessment_id, model_key, name, mode, status, is_default, config, output_summary, created_by, created_at, updated_at')
    .eq('assessment_id', input.assessmentId)

  if (input.scoringModelId?.trim()) {
    query = query.eq('id', input.scoringModelId.trim())
  } else {
    query = query.eq('is_default', true)
  }

  const { data, error } = await query.order('is_default', { ascending: false }).limit(1).maybeSingle()
  if (error || !data) {
    return null
  }

  return data as AssessmentScoringModelRecord
}

export async function createAdminScoringModel(input: {
  adminClient: AdminClient
  assessmentId: string
  userId: string
  payload: {
    name?: string
    modelKey?: string
    mode?: AssessmentScoringModelMode
    status?: 'draft' | 'published' | 'archived'
    isDefault?: boolean
    cloneFromModelId?: string | null
  } | null
}) {
  await ensureSeededAssessmentScoringModels(input)

  const assessment = await getAssessmentSeedContext(input.adminClient, input.assessmentId)
  if (!assessment) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const name = String(input.payload?.name ?? '').trim()
  if (!name) {
    return { ok: false as const, error: 'invalid_payload' as const }
  }

  const mode = normalizeScoringModelMode(input.payload?.mode ?? assessment.scoring_engine)
  const status = normalizeScoringModelStatus(input.payload?.status)
  const cloneFromModelId = input.payload?.cloneFromModelId?.trim() || null

  let baseConfig = normalizeScoringModelConfig(assessment.scoring_config)
  if (cloneFromModelId) {
    const cloneModel = await getAssessmentScoringModel({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      scoringModelId: cloneFromModelId,
    })
    if (cloneModel) {
      baseConfig = normalizeScoringModelConfig(cloneModel.config)
    }
  }

  const isDefault = Boolean(input.payload?.isDefault) && status !== 'archived'
  const modelKey = toScoringModelKey(
    String(input.payload?.modelKey ?? ''),
    toScoringModelKey(name, 'scoring_model')
  )

  if (isDefault) {
    await input.adminClient
      .from('assessment_scoring_models')
      .update({ is_default: false })
      .eq('assessment_id', input.assessmentId)
  }

  const { data, error } = await input.adminClient
    .from('assessment_scoring_models')
    .insert({
      assessment_id: input.assessmentId,
      model_key: modelKey,
      name,
      mode,
      status,
      is_default: isDefault,
      config: baseConfig,
      output_summary: buildScoringModelOutputSummary(baseConfig),
      created_by: input.userId,
      updated_at: new Date().toISOString(),
    })
    .select('id, assessment_id, model_key, name, mode, status, is_default, config, output_summary, created_by, created_at, updated_at')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'scoring_model_create_failed' as const }
  }

  if (isDefault) {
    await syncAssessmentDefaultModel({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      mode,
      config: baseConfig,
    })
  }

  return {
    ok: true as const,
    data: {
      scoringModel: data as AssessmentScoringModelRecord,
    },
  }
}

export async function updateAdminScoringModel(input: {
  adminClient: AdminClient
  assessmentId: string
  scoringModelId: string
  payload: {
    name?: string
    mode?: AssessmentScoringModelMode
    status?: 'draft' | 'published' | 'archived'
    isDefault?: boolean
    config?: unknown
  } | null
}) {
  if (!input.payload) {
    return { ok: false as const, error: 'invalid_payload' as const }
  }

  await ensureSeededAssessmentScoringModels(input)

  const { data: existing, error: existingError } = await input.adminClient
    .from('assessment_scoring_models')
    .select('id, assessment_id, model_key, name, mode, status, is_default, config, output_summary')
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.scoringModelId)
    .maybeSingle()

  if (existingError || !existing) {
    return { ok: false as const, error: 'scoring_model_not_found' as const }
  }

  const nextMode = normalizeScoringModelMode(input.payload.mode ?? existing.mode)
  const nextStatus = normalizeScoringModelStatus(input.payload.status ?? existing.status)
  const nextConfig = input.payload.config !== undefined
    ? normalizeScoringModelConfig(input.payload.config)
    : normalizeScoringModelConfig(existing.config)
  const nextIsDefault = existing.is_default
    ? nextStatus !== 'archived' && input.payload.isDefault !== false
    : Boolean(input.payload.isDefault) && nextStatus !== 'archived'

  if (nextIsDefault) {
    await input.adminClient
      .from('assessment_scoring_models')
      .update({ is_default: false })
      .eq('assessment_id', input.assessmentId)
  }

  const { data, error } = await input.adminClient
    .from('assessment_scoring_models')
    .update({
      name: typeof input.payload.name === 'string' ? input.payload.name.trim() : existing.name,
      mode: nextMode,
      status: nextStatus,
      is_default: nextIsDefault,
      config: nextConfig,
      output_summary: buildScoringModelOutputSummary(nextConfig),
      updated_at: new Date().toISOString(),
    })
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.scoringModelId)
    .select('id, assessment_id, model_key, name, mode, status, is_default, config, output_summary, created_by, created_at, updated_at')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'scoring_model_update_failed' as const }
  }

  await syncReportVariantsForScoringModel({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    scoringModelId: input.scoringModelId,
    config: nextConfig,
  })

  if (nextIsDefault || existing.is_default) {
    await syncAssessmentDefaultModel({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      mode: nextMode,
      config: nextConfig,
    })
  }

  return {
    ok: true as const,
    data: {
      scoringModel: data as AssessmentScoringModelRecord,
    },
  }
}

export function getEmptyScoringModelConfig() {
  return createEmptyScoringConfig()
}
