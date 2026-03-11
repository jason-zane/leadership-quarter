import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { normalizeRunnerConfig } from '@/utils/assessments/experience-config'
import {
  analyzeScoringConfig,
  createEmptyScoringConfig,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config'
import { DEFAULT_REPORT_CONFIG, DEFAULT_RUNNER_CONFIG } from '@/utils/assessments/experience-config'
import {
  ensureSeededAssessmentScoringModels,
  setAssessmentDefaultScoringModelConfig,
} from '@/utils/services/admin-scoring-models'
import { ensureSeededAssessmentReportVariants } from '@/utils/reports/report-variants'

type AdminClient = RouteAuthSuccess['adminClient']

type AdminAssessmentCreatePayload = {
  key?: string
  name?: string
  external_name?: string
  description?: string
  status?: 'draft' | 'active' | 'archived'
  isPublic?: boolean
  scoringEngine?: 'rule_based' | 'psychometric' | 'hybrid'
  runnerConfig?: unknown
  reportConfig?: unknown
}

type AdminAssessmentUpdatePayload = {
  key?: string
  name?: string
  external_name?: string
  description?: string | null
  status?: 'draft' | 'active' | 'archived'
  isPublic?: boolean
  version?: number
  scoringEngine?: 'rule_based' | 'psychometric' | 'hybrid'
  runnerConfig?: unknown
  reportConfig?: unknown
}

export async function listAdminAssessments(input: {
  adminClient: AdminClient
}): Promise<
  | {
      ok: true
      data: {
        assessments: unknown[]
      }
    }
  | {
      ok: false
      error: 'surveys_list_failed'
    }
> {
  const { data, error } = await input.adminClient
    .from('assessments')
    .select(
      'id, key, name, external_name, description, status, is_public, version, scoring_engine, runner_config, report_config, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })

  if (error) {
    return { ok: false, error: 'surveys_list_failed' }
  }

  return {
    ok: true,
    data: {
      assessments: data ?? [],
    },
  }
}

export async function createAdminAssessment(input: {
  adminClient: AdminClient
  userId: string
  payload: AdminAssessmentCreatePayload | null
}): Promise<
  | {
      ok: true
      data: {
        assessment: unknown
      }
    }
  | {
      ok: false
      error: 'invalid_fields' | 'survey_create_failed'
      message?: string
    }
> {
  const key = String(input.payload?.key ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
  const name = String(input.payload?.name ?? '').trim()
  const externalName = String(input.payload?.external_name ?? '').trim()

  if (!key || !name || !externalName) {
    return { ok: false, error: 'invalid_fields' }
  }

  const { data, error } = await input.adminClient
    .from('assessments')
    .insert({
      key,
      name,
      external_name: externalName,
      description: String(input.payload?.description ?? '').trim() || null,
      status: input.payload?.status ?? 'draft',
      is_public: input.payload?.isPublic ?? false,
      version: 1,
      scoring_engine: input.payload?.scoringEngine ?? 'rule_based',
      scoring_config: createEmptyScoringConfig(),
      runner_config: input.payload?.runnerConfig ?? DEFAULT_RUNNER_CONFIG,
      report_config: input.payload?.reportConfig ?? DEFAULT_REPORT_CONFIG,
      created_by: input.userId,
      updated_at: new Date().toISOString(),
    })
    .select('id, key, name, external_name, status, is_public, version, scoring_engine, runner_config, report_config')
    .single()

  if (error || !data) {
    return {
      ok: false,
      error: 'survey_create_failed',
      message: error?.message,
    }
  }

  await ensureSeededAssessmentScoringModels({
    adminClient: input.adminClient,
    assessmentId: data.id,
  })
  await ensureSeededAssessmentReportVariants({
    adminClient: input.adminClient,
    assessmentId: data.id,
  })

  return {
    ok: true,
    data: {
      assessment: data,
    },
  }
}

export async function getAdminAssessment(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<
  | {
      ok: true
      data: {
        assessment: unknown
      }
    }
  | {
      ok: false
      error: 'survey_not_found'
    }
> {
  const { data, error } = await input.adminClient
    .from('assessments')
    .select(
      'id, key, name, external_name, description, status, is_public, version, scoring_engine, scoring_config, runner_config, report_config, public_url, created_at, updated_at'
    )
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: 'survey_not_found' }
  }

  return {
    ok: true,
    data: {
      assessment: data,
    },
  }
}

export async function updateAdminAssessment(input: {
  adminClient: AdminClient
  assessmentId: string
  payload: AdminAssessmentUpdatePayload | null
}): Promise<
  | {
      ok: true
      data: {
        assessment: unknown
      }
    }
  | {
      ok: false
      error: 'assessment_not_publishable' | 'survey_update_failed'
      issues?: unknown[]
      coverage?: unknown
    }
> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  let currentAssessment: { scoring_config?: unknown; runner_config?: unknown } | null = null

  async function loadCurrentAssessment() {
    if (currentAssessment) return currentAssessment

    const { data } = await input.adminClient
      .from('assessments')
      .select('scoring_config, runner_config')
      .eq('id', input.assessmentId)
      .maybeSingle()

    currentAssessment = (data ?? null) as { scoring_config?: unknown; runner_config?: unknown } | null
    return currentAssessment
  }

  if (typeof input.payload?.key === 'string') {
    updates.key = input.payload.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  }
  if (typeof input.payload?.name === 'string') updates.name = input.payload.name.trim()
  if (typeof input.payload?.external_name === 'string') updates.external_name = input.payload.external_name.trim()
  if (typeof input.payload?.description === 'string' || input.payload?.description === null) {
    updates.description = input.payload.description ? input.payload.description.trim() : null
  }
  if (input.payload?.status) updates.status = input.payload.status
  if (typeof input.payload?.isPublic === 'boolean') updates.is_public = input.payload.isPublic
  if (input.payload?.scoringEngine) updates.scoring_engine = input.payload.scoringEngine
  if (input.payload?.runnerConfig !== undefined) updates.runner_config = input.payload.runnerConfig
  if (input.payload?.reportConfig !== undefined) updates.report_config = input.payload.reportConfig
  if (
    typeof input.payload?.version === 'number' &&
    Number.isInteger(input.payload.version) &&
    input.payload.version > 0
  ) {
    updates.version = input.payload.version
  }

  if (input.payload?.status === 'active') {
    const current = await loadCurrentAssessment()

    const runnerConfig = normalizeRunnerConfig(input.payload.runnerConfig ?? current?.runner_config ?? {})
    if (!runnerConfig.data_collection_only) {
      const { data: questions } = await input.adminClient
        .from('assessment_questions')
        .select('dimension, is_active')
        .eq('assessment_id', input.assessmentId)

      const analysis = analyzeScoringConfig(
        normalizeScoringConfig(current?.scoring_config),
        questions ?? []
      )

      if (!analysis.canPublish) {
        return {
          ok: false,
          error: 'assessment_not_publishable',
          issues: analysis.checks.filter((check) => !check.pass),
          coverage: analysis.coverage,
        }
      }
    }
  }

  const { data, error } = await input.adminClient
    .from('assessments')
    .update(updates)
    .eq('id', input.assessmentId)
    .select(
      'id, key, name, external_name, description, status, is_public, version, scoring_engine, runner_config, report_config, updated_at'
    )
    .single()

  if (error || !data) {
    return { ok: false, error: 'survey_update_failed' }
  }

  if (input.payload?.scoringEngine) {
    const current = await loadCurrentAssessment()
    await setAssessmentDefaultScoringModelConfig({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      config: current?.scoring_config ?? createEmptyScoringConfig(),
      mode: input.payload.scoringEngine,
    })
  }

  return {
    ok: true,
    data: {
      assessment: data,
    },
  }
}

export async function deleteAdminAssessment(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<
  | { ok: true }
  | {
      ok: false
      error: 'survey_delete_failed'
    }
> {
  const { error } = await input.adminClient.from('assessments').delete().eq('id', input.assessmentId)

  if (error) {
    return { ok: false, error: 'survey_delete_failed' }
  }

  return { ok: true }
}
