import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  getAssessmentScoringModel,
  listAdminScoringModels,
} from '@/utils/services/admin-scoring-models'
import {
  createSubmissionDefaultReportSnapshot,
  ensureSeededAssessmentReportVariants,
  resolveReportDefinitionCompatibility,
  type AssessmentReportVariantRecord,
  type ReportDefinitionRecord,
} from '@/utils/reports/report-variants'

type AdminClient = RouteAuthSuccess['adminClient']

type AssessmentRow = {
  id: string
  key: string
  scoring_config: unknown
  report_config: unknown
}

function toKey(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

async function getAssessmentContext(adminClient: AdminClient, assessmentId: string) {
  const { data } = await adminClient
    .from('assessments')
    .select('id, key, scoring_config, report_config')
    .eq('id', assessmentId)
    .maybeSingle()

  return (data ?? null) as AssessmentRow | null
}

async function getDefinitionByKey(adminClient: AdminClient, definitionKey: string) {
  const { data } = await adminClient
    .from('report_definitions')
    .select('id, key, name, description, renderer_type, status, compatibility_rules')
    .eq('key', definitionKey)
    .maybeSingle()

  return (data ?? null) as ReportDefinitionRecord | null
}

export async function listAdminReportVariants(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  await ensureSeededAssessmentReportVariants({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })

  const assessment = await getAssessmentContext(input.adminClient, input.assessmentId)
  if (!assessment) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const scoringModelsResult = await listAdminScoringModels({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })
  if (!scoringModelsResult.ok) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const defaultScoringModel = scoringModelsResult.data.models.find((model) => model.is_default)
    ?? scoringModelsResult.data.models[0]
    ?? null

  const [{ data: definitions }, { data: variants }] = await Promise.all([
    input.adminClient
      .from('report_definitions')
      .select('id, key, name, description, renderer_type, status, compatibility_rules')
      .order('name'),
    input.adminClient
      .from('assessment_report_variants')
      .select('id, assessment_id, report_definition_id, variant_key, name, version, status, is_default, scoring_model_id, scoring_config, report_config, compatibility_snapshot')
      .eq('assessment_id', input.assessmentId)
      .order('variant_key')
      .order('version', { ascending: false }),
  ])

  const compatibleDefinitions = (definitions ?? []).map((definition) => ({
    ...(definition as ReportDefinitionRecord),
    compatibility: resolveReportDefinitionCompatibility({
      definitionKey: (definition as ReportDefinitionRecord).key,
      assessmentKey: assessment.key,
      scoringConfig: defaultScoringModel?.config ?? assessment.scoring_config,
    }),
  }))

  return {
    ok: true as const,
    data: {
      assessment,
      scoringModels: scoringModelsResult.data.models,
      definitions: compatibleDefinitions,
      variants: (variants ?? []) as AssessmentReportVariantRecord[],
    },
  }
}

export async function createAdminReportVariant(input: {
  adminClient: AdminClient
  assessmentId: string
  userId: string
  payload: {
    definitionKey?: string
    scoringModelId?: string | null
    name?: string
    variantKey?: string
    status?: 'draft' | 'published' | 'archived'
    isDefault?: boolean
  } | null
}) {
  const assessment = await getAssessmentContext(input.adminClient, input.assessmentId)
  if (!assessment) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const definitionKey = String(input.payload?.definitionKey ?? '').trim()
  const name = String(input.payload?.name ?? '').trim()
  if (!definitionKey || !name) {
    return { ok: false as const, error: 'invalid_payload' as const }
  }

  const definition = await getDefinitionByKey(input.adminClient, definitionKey)
  if (!definition) {
    return { ok: false as const, error: 'definition_not_found' as const }
  }

  const scoringModel = await getAssessmentScoringModel({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    scoringModelId: input.payload?.scoringModelId,
  })
  if (!scoringModel) {
    return { ok: false as const, error: 'invalid_payload' as const }
  }

  const compatibility = resolveReportDefinitionCompatibility({
    definitionKey: definition.key,
    assessmentKey: assessment.key,
    scoringConfig: scoringModel.config,
  })
  if (!compatibility.compatible) {
    return { ok: false as const, error: 'definition_incompatible' as const, message: compatibility.reason }
  }

  const variantKey = toKey(String(input.payload?.variantKey ?? ''), toKey(name, definition.key))
  const { data: existingVersions } = await input.adminClient
    .from('assessment_report_variants')
    .select('version')
    .eq('assessment_id', input.assessmentId)
    .eq('variant_key', variantKey)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = Number(existingVersions?.[0]?.version ?? 0) + 1
  const status = input.payload?.status ?? 'draft'
  const isDefault = Boolean(input.payload?.isDefault) && status === 'published'

  if (isDefault) {
    await input.adminClient
      .from('assessment_report_variants')
      .update({ is_default: false })
      .eq('assessment_id', input.assessmentId)
  }

  const { data, error } = await input.adminClient
    .from('assessment_report_variants')
    .insert({
      assessment_id: input.assessmentId,
      report_definition_id: definition.id,
      variant_key: variantKey,
      name,
      version: nextVersion,
      status,
      is_default: isDefault,
      scoring_model_id: scoringModel.id,
      scoring_config: scoringModel.config ?? {},
      report_config: assessment.report_config ?? {},
      compatibility_snapshot: {
        compatible: compatibility.compatible,
        reason: compatibility.reason,
      },
      created_by: input.userId,
      updated_at: new Date().toISOString(),
    })
    .select('id, assessment_id, report_definition_id, variant_key, name, version, status, is_default, scoring_model_id, scoring_config, report_config, compatibility_snapshot')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'variant_create_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      variant: data as AssessmentReportVariantRecord,
      definition,
      defaultSnapshot: status === 'published'
        ? createSubmissionDefaultReportSnapshot({
            variant: data as AssessmentReportVariantRecord,
            definition,
          })
        : null,
    },
  }
}

export async function updateAdminReportVariant(input: {
  adminClient: AdminClient
  assessmentId: string
  variantId: string
  payload: {
    name?: string
    status?: 'draft' | 'published' | 'archived'
    isDefault?: boolean
    scoringModelId?: string | null
    reportConfig?: unknown
  } | null
}) {
  const assessment = await getAssessmentContext(input.adminClient, input.assessmentId)
  if (!assessment || !input.payload) {
    return { ok: false as const, error: 'invalid_payload' as const }
  }

  const { data: existing } = await input.adminClient
    .from('assessment_report_variants')
    .select('id, assessment_id, report_definition_id, variant_key, name, version, status, is_default, scoring_model_id, scoring_config, report_config, compatibility_snapshot')
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.variantId)
    .maybeSingle()

  if (!existing) {
    return { ok: false as const, error: 'variant_not_found' as const }
  }

  const definition = await input.adminClient
    .from('report_definitions')
    .select('id, key, name, description, renderer_type, status, compatibility_rules')
    .eq('id', existing.report_definition_id)
    .maybeSingle()

  if (!definition.data) {
    return { ok: false as const, error: 'definition_not_found' as const }
  }

  const scoringModel = await getAssessmentScoringModel({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    scoringModelId: input.payload.scoringModelId ?? existing.scoring_model_id ?? null,
  })
  if (!scoringModel) {
    return { ok: false as const, error: 'invalid_payload' as const }
  }

  const compatibility = resolveReportDefinitionCompatibility({
    definitionKey: (definition.data as ReportDefinitionRecord).key,
    assessmentKey: assessment.key,
    scoringConfig: scoringModel.config,
  })

  const configChanged =
    input.payload.scoringModelId !== undefined
    || typeof input.payload.reportConfig !== 'undefined'

  const nextStatus = input.payload.status ?? (existing.status as AssessmentReportVariantRecord['status'])
  const nextIsDefault = Boolean(input.payload.isDefault) && nextStatus === 'published'

  if (nextIsDefault) {
    await input.adminClient
      .from('assessment_report_variants')
      .update({ is_default: false })
      .eq('assessment_id', input.assessmentId)
  }

  const { data, error } = await input.adminClient
    .from('assessment_report_variants')
    .update({
      name: typeof input.payload.name === 'string' ? input.payload.name.trim() : existing.name,
      status: nextStatus,
      is_default: nextIsDefault,
      scoring_model_id: scoringModel.id,
      scoring_config: scoringModel.config,
      report_config: input.payload.reportConfig ?? existing.report_config,
      compatibility_snapshot: {
        compatible: compatibility.compatible,
        reason: compatibility.reason,
      },
      version: configChanged ? Number(existing.version ?? 1) + 1 : existing.version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.variantId)
    .eq('assessment_id', input.assessmentId)
    .select('id, assessment_id, report_definition_id, variant_key, name, version, status, is_default, scoring_model_id, scoring_config, report_config, compatibility_snapshot')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'variant_update_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      variant: data as AssessmentReportVariantRecord,
      definition: definition.data as ReportDefinitionRecord,
    },
  }
}
