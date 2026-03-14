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

type AssessmentDuplicateSource = {
  id: string
  key: string
  name: string
  external_name: string
  description: string | null
  is_public: boolean
  version: number
  scoring_engine: 'rule_based' | 'psychometric' | 'hybrid'
  scoring_config: unknown
  runner_config: unknown
  report_config: unknown
  v2_question_bank?: unknown
  v2_scoring_config?: unknown
  v2_psychometrics_config?: unknown
  v2_report_template?: unknown
  v2_report_template_id?: string | null
}

function normalizeAssessmentKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function isMissingAssessmentColumn(
  error: { message?: string; details?: string | null; hint?: string | null } | null | undefined,
  column: string
) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes(column) && (text.includes('column') || text.includes('schema cache') || text.includes('schema'))
}

async function loadAssessmentForDuplicate(adminClient: AdminClient, assessmentId: string) {
  const primary = await adminClient
    .from('assessments')
    .select(
      'id, key, name, external_name, description, is_public, version, scoring_engine, scoring_config, runner_config, report_config, v2_question_bank, v2_scoring_config, v2_psychometrics_config, v2_report_template, v2_report_template_id'
    )
    .eq('id', assessmentId)
    .maybeSingle()

  const missingV2Columns = primary.error
    && (
      isMissingAssessmentColumn(primary.error, 'v2_question_bank')
      || isMissingAssessmentColumn(primary.error, 'v2_scoring_config')
      || isMissingAssessmentColumn(primary.error, 'v2_psychometrics_config')
      || isMissingAssessmentColumn(primary.error, 'v2_report_template')
      || isMissingAssessmentColumn(primary.error, 'v2_report_template_id')
    )

  if (!missingV2Columns) {
    return primary as {
      data: AssessmentDuplicateSource | null
      error: typeof primary.error
    }
  }

  const fallback = await adminClient
    .from('assessments')
    .select(
      'id, key, name, external_name, description, is_public, version, scoring_engine, scoring_config, runner_config, report_config'
    )
    .eq('id', assessmentId)
    .maybeSingle()

  if (fallback.error || !fallback.data) {
    return fallback
  }

  const reportConfig = (fallback.data.report_config ?? {}) as Record<string, unknown>

  return {
    data: {
      ...fallback.data,
      v2_question_bank: reportConfig.v2_question_bank ?? null,
      v2_scoring_config: reportConfig.v2_scoring_config ?? null,
      v2_psychometrics_config: reportConfig.v2_psychometrics_config ?? null,
      v2_report_template: reportConfig.v2_report_template ?? null,
      v2_report_template_id:
        typeof reportConfig.v2_report_template_id === 'string' ? reportConfig.v2_report_template_id : null,
    } satisfies AssessmentDuplicateSource,
    error: null,
  }
}

async function generateDuplicateAssessmentKey(adminClient: AdminClient, sourceKey: string) {
  const normalizedSourceKey = normalizeAssessmentKey(sourceKey)
  const baseKey = normalizeAssessmentKey(`${normalizedSourceKey}_copy`) || 'assessment_copy'
  const { data } = await adminClient
    .from('assessments')
    .select('key')
    .ilike('key', `${baseKey}%`)

  const existingKeys = new Set(
    ((data ?? []) as Array<{ key?: string | null }>)
      .map((row) => normalizeAssessmentKey(String(row.key ?? '')))
      .filter(Boolean)
  )

  if (!existingKeys.has(baseKey)) {
    return baseKey
  }

  let suffix = 2
  while (existingKeys.has(`${baseKey}_${suffix}`)) {
    suffix += 1
  }

  return `${baseKey}_${suffix}`
}

function isSchemaErrorMessage(message: string | undefined) {
  const normalized = String(message ?? '').toLowerCase()
  return normalized.includes('column') || normalized.includes('schema') || normalized.includes('does not exist')
}

async function copyV2AssessmentReports(input: {
  adminClient: AdminClient
  sourceAssessmentId: string
  targetAssessmentId: string
  updatedAt: string
}) {
  const reports = await input.adminClient
    .from('v2_assessment_reports')
    .select('name, report_kind, audience_role, base_report_id, override_definition, sort_order, template_definition')
    .eq('assessment_id', input.sourceAssessmentId)
    .order('sort_order')

  if (reports.error) {
    if (isSchemaErrorMessage(reports.error.message)) {
      return { ok: true as const }
    }

    return {
      ok: false as const,
      message: reports.error.message,
    }
  }

  const reportRows = (reports.data ?? []) as Array<{
    name: string
    report_kind: string
    audience_role: string
    base_report_id: string | null
    override_definition: unknown
    sort_order: number
    template_definition: unknown
  }>

  if (reportRows.length === 0) {
    return { ok: true as const }
  }

  const reportInsert = await input.adminClient.from('v2_assessment_reports').insert(
    reportRows.map((report) => ({
      assessment_id: input.targetAssessmentId,
      name: report.name,
      report_kind: report.report_kind,
      audience_role: report.audience_role,
      base_report_id: null,
      override_definition: report.override_definition,
      status: 'draft',
      is_default: false,
      sort_order: report.sort_order,
      template_definition: report.template_definition,
      updated_at: input.updatedAt,
    }))
  )

  if (reportInsert.error && !isSchemaErrorMessage(reportInsert.error.message)) {
    return {
      ok: false as const,
      message: reportInsert.error.message,
    }
  }

  return { ok: true as const }
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

export async function duplicateAdminAssessment(input: {
  adminClient: AdminClient
  assessmentId: string
  userId: string
}): Promise<
  | {
      ok: true
      data: {
        assessment: unknown
      }
    }
  | {
      ok: false
      error: 'assessment_not_found' | 'survey_duplicate_failed'
      message?: string
    }
> {
  const source = await loadAssessmentForDuplicate(input.adminClient, input.assessmentId)

  if (source.error || !source.data) {
    return { ok: false, error: 'assessment_not_found' }
  }

  const sourceAssessment = source.data as AssessmentDuplicateSource
  const duplicateKey = await generateDuplicateAssessmentKey(input.adminClient, sourceAssessment.key)
  const duplicateName = `${sourceAssessment.name} copy`
  const duplicateExternalName = `${sourceAssessment.external_name} copy`
  const sourceReportConfig = sourceAssessment.report_config && typeof sourceAssessment.report_config === 'object'
    ? sourceAssessment.report_config as Record<string, unknown>
    : {}
  const now = new Date().toISOString()

  const { data, error } = await input.adminClient
    .from('assessments')
    .insert({
      key: duplicateKey,
      name: duplicateName,
      external_name: duplicateExternalName,
      description: sourceAssessment.description,
      status: 'draft',
      is_public: false,
      version: 1,
      scoring_engine: sourceAssessment.scoring_engine,
      scoring_config: sourceAssessment.scoring_config,
      runner_config: sourceAssessment.runner_config,
      report_config: sourceAssessment.report_config,
      v2_question_bank: sourceAssessment.v2_question_bank ?? {},
      v2_scoring_config: sourceAssessment.v2_scoring_config ?? null,
      v2_psychometrics_config: sourceAssessment.v2_psychometrics_config ?? null,
      v2_report_template: sourceAssessment.v2_report_template ?? null,
      v2_report_template_id: sourceAssessment.v2_report_template_id ?? null,
      created_by: input.userId,
      updated_at: now,
    })
    .select(
      'id, key, name, external_name, description, status, is_public, version, scoring_engine, runner_config, report_config, updated_at'
    )
    .single()

  if (error || !data) {
    if (!isSchemaErrorMessage(error?.message)) {
      return {
        ok: false,
        error: 'survey_duplicate_failed',
        message: error?.message,
      }
    }

    const fallback = await input.adminClient
      .from('assessments')
      .insert({
        key: duplicateKey,
        name: duplicateName,
        external_name: duplicateExternalName,
        description: sourceAssessment.description,
        status: 'draft',
        is_public: false,
        version: 1,
        scoring_engine: sourceAssessment.scoring_engine,
        scoring_config: sourceAssessment.scoring_config,
        runner_config: sourceAssessment.runner_config,
        report_config: {
          ...sourceReportConfig,
          v2_question_bank: sourceAssessment.v2_question_bank ?? {},
          v2_scoring_config: sourceAssessment.v2_scoring_config ?? null,
          v2_psychometrics_config: sourceAssessment.v2_psychometrics_config ?? null,
          v2_report_template: sourceAssessment.v2_report_template ?? null,
          v2_report_template_id: sourceAssessment.v2_report_template_id ?? null,
        },
        created_by: input.userId,
        updated_at: now,
      })
      .select(
        'id, key, name, external_name, description, status, is_public, version, scoring_engine, runner_config, report_config, updated_at'
      )
      .single()

    if (fallback.error || !fallback.data) {
      return {
        ok: false,
        error: 'survey_duplicate_failed',
        message: fallback.error?.message,
      }
    }

    const copiedReports = await copyV2AssessmentReports({
      adminClient: input.adminClient,
      sourceAssessmentId: input.assessmentId,
      targetAssessmentId: fallback.data.id,
      updatedAt: now,
    })

    if (!copiedReports.ok) {
      return {
        ok: false,
        error: 'survey_duplicate_failed',
        message: copiedReports.message,
      }
    }

    await ensureSeededAssessmentScoringModels({
      adminClient: input.adminClient,
      assessmentId: fallback.data.id,
    })
    await ensureSeededAssessmentReportVariants({
      adminClient: input.adminClient,
      assessmentId: fallback.data.id,
    })

    return {
      ok: true,
      data: {
        assessment: fallback.data,
      },
    }
  }

  const copiedReports = await copyV2AssessmentReports({
    adminClient: input.adminClient,
    sourceAssessmentId: input.assessmentId,
    targetAssessmentId: data.id,
    updatedAt: now,
  })

  if (!copiedReports.ok) {
    return {
      ok: false,
      error: 'survey_duplicate_failed',
      message: copiedReports.message,
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

export async function deleteAdminAssessment(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<
  | { ok: true }
  | {
      ok: false
      error: 'survey_delete_failed' | 'survey_has_submissions'
    }
> {
  const { count, error: submissionsError } = await input.adminClient
    .from('assessment_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', input.assessmentId)

  if (submissionsError) {
    return { ok: false, error: 'survey_delete_failed' }
  }

  if ((count ?? 0) > 0) {
    return { ok: false, error: 'survey_has_submissions' }
  }

  const { error } = await input.adminClient.from('assessments').delete().eq('id', input.assessmentId)

  if (error) {
    return { ok: false, error: 'survey_delete_failed' }
  }

  return { ok: true }
}
