import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import { normalizeReportConfig } from '@/utils/assessments/experience-config'
import {
  normalizeCampaignAssessmentReportDeliveryConfig,
  normalizeCampaignAssessmentReportOverrides,
  type CampaignAssessmentReportDeliveryConfig,
} from '@/utils/reports/report-overrides'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ReportDefinitionKey = 'generic_assessment' | 'ai_orientation'
export type ReportRendererType = 'assessment' | 'ai_survey'
export type ReportSelectionMode = 'frozen_default' | 'latest_variant' | 'latest_campaign_default'

export type ReportDefinitionRecord = {
  id: string
  key: ReportDefinitionKey
  name: string
  description: string | null
  renderer_type: ReportRendererType
  status: 'draft' | 'active' | 'archived'
  compatibility_rules?: unknown
}

export type AssessmentReportVariantRecord = {
  id: string
  assessment_id: string
  report_definition_id: string
  variant_key: string
  name: string
  version: number
  status: 'draft' | 'published' | 'archived'
  is_default: boolean
  scoring_model_id?: string | null
  scoring_config: unknown
  report_config: unknown
  compatibility_snapshot?: unknown
}

export type SubmissionDefaultReportSnapshot = {
  selectionMode: 'frozen_default'
  variantId: string
  variantKey: string
  variantName: string
  version: number
  definitionKey: ReportDefinitionKey
  rendererType: ReportRendererType
  scoringConfig: Record<string, unknown>
  reportConfig: Record<string, unknown>
}

export type SubmissionReportOption = {
  key: string
  label: string
  description: string
  selectionMode: ReportSelectionMode
  reportVariantId: string | null
  currentDefault: boolean
}

type ReportDefinitionWithCompatibility = ReportDefinitionRecord & {
  compatibility?: {
    compatible: boolean
    reason: string
  }
}

type AssessmentReportVariantRow = AssessmentReportVariantRecord & {
  report_definitions?:
    | ReportDefinitionRecord
    | ReportDefinitionRecord[]
    | null
}

type CampaignAssessmentReportContext = {
  reportOverrides: ReturnType<typeof normalizeCampaignAssessmentReportOverrides>
  deliveryConfig: CampaignAssessmentReportDeliveryConfig
}

type SubmissionSelectionContext = {
  submissionId: string
  assessmentId: string
  campaignId: string | null
  defaultSnapshot: SubmissionDefaultReportSnapshot | null
}

type AssessmentSeedContext = {
  id: string
  key: string
  name: string
  scoring_config: unknown
  report_config: unknown
  created_by: string | null
}

export type ResolvedSubmissionReportSelection =
  | {
      submissionId: string
      assessmentId: string
      campaignId: string | null
      selectionMode: 'frozen_default'
      reportVariantId: string
      definitionKey: ReportDefinitionKey
      rendererType: ReportRendererType
      variantName: string
      scoringConfig: Record<string, unknown>
      reportConfig: Record<string, unknown>
    }
  | {
      submissionId: string
      assessmentId: string
      campaignId: string | null
      selectionMode: 'latest_variant' | 'latest_campaign_default'
      reportVariantId: string
      definitionKey: ReportDefinitionKey
      rendererType: ReportRendererType
      variantName: string
      scoringConfig: Record<string, unknown>
      reportConfig: Record<string, unknown>
    }

function isAiOrientationSeedAssessmentKey(value: string | null | undefined) {
  return typeof value === 'string' && value.trim() === 'ai_readiness_orientation_v1'
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeSubmissionDefaultReportSnapshot(
  value: unknown
): SubmissionDefaultReportSnapshot | null {
  if (!isObject(value)) {
    return null
  }

  const variantId = typeof value.variantId === 'string' ? value.variantId.trim() : ''
  const variantKey = typeof value.variantKey === 'string' ? value.variantKey.trim() : ''
  const variantName = typeof value.variantName === 'string' ? value.variantName.trim() : ''
  const version = typeof value.version === 'number' && Number.isFinite(value.version) ? Math.floor(value.version) : 0
  const definitionKey = value.definitionKey === 'ai_orientation' ? 'ai_orientation' : value.definitionKey === 'generic_assessment' ? 'generic_assessment' : null
  const rendererType = value.rendererType === 'ai_survey' ? 'ai_survey' : value.rendererType === 'assessment' ? 'assessment' : null

  if (!variantId || !variantKey || !variantName || !version || !definitionKey || !rendererType) {
    return null
  }

  return {
    selectionMode: 'frozen_default',
    variantId,
    variantKey,
    variantName,
    version,
    definitionKey,
    rendererType,
    scoringConfig: isObject(value.scoringConfig) ? value.scoringConfig : {},
    reportConfig: isObject(value.reportConfig) ? value.reportConfig : {},
  }
}

export function resolveReportDefinitionCompatibility(input: {
  definitionKey: ReportDefinitionKey
  assessmentKey?: string | null
  scoringConfig: unknown
}) {
  const normalized = normalizeScoringConfig(input.scoringConfig)
  const dimensionKeys = new Set(normalized.dimensions.map((dimension) => dimension.key))

  if (input.definitionKey === 'generic_assessment') {
    return {
      compatible: normalized.dimensions.length > 0,
      reason:
        normalized.dimensions.length > 0
          ? 'Assessment has scoreable dimensions.'
          : 'Assessment has no configured scoreable dimensions yet.',
    }
  }

  const aiOrientationCompatible =
    dimensionKeys.has('openness')
    && dimensionKeys.has('riskPosture')
    && dimensionKeys.has('capability')

  return {
    compatible: aiOrientationCompatible,
    reason: aiOrientationCompatible
      ? 'Assessment has the AI orientation dimensions required for the orientation report.'
      : 'Assessment is missing the required openness, riskPosture, and capability dimensions.',
  }
}

export function resolveVariantReportConfig(input: {
  variantReportConfig: unknown
  campaignReportOverrides?: unknown
}) {
  const base = normalizeReportConfig(input.variantReportConfig)
  const campaignOverrides = normalizeCampaignAssessmentReportOverrides(input.campaignReportOverrides)
  const reportVariantOverrides = isObject(campaignOverrides.report_variant_overrides)
    && isObject(campaignOverrides.report_variant_overrides.report_config)
    ? campaignOverrides.report_variant_overrides.report_config
    : {}

  return normalizeReportConfig({
    ...base,
    ...reportVariantOverrides,
    competency_overrides: {
      ...base.competency_overrides,
      ...campaignOverrides.competency_overrides,
    },
  })
}

export function resolveVariantScoringConfig(input: {
  variantScoringConfig: unknown
  campaignReportOverrides?: unknown
}) {
  const campaignOverrides = normalizeCampaignAssessmentReportOverrides(input.campaignReportOverrides)
  const scoringOverrides = isObject(campaignOverrides.report_variant_overrides)
    && isObject(campaignOverrides.report_variant_overrides.scoring_config)
    ? campaignOverrides.report_variant_overrides.scoring_config
    : null

  if (scoringOverrides) {
    return scoringOverrides
  }

  return input.variantScoringConfig
}

export function createSubmissionDefaultReportSnapshot(input: {
  variant: AssessmentReportVariantRecord
  definition: ReportDefinitionRecord
  campaignReportOverrides?: unknown
}) {
  return {
    selectionMode: 'frozen_default' as const,
    variantId: input.variant.id,
    variantKey: input.variant.variant_key,
    variantName: input.variant.name,
    version: input.variant.version,
    definitionKey: input.definition.key,
    rendererType: input.definition.renderer_type,
    scoringConfig: resolveVariantScoringConfig({
      variantScoringConfig: input.variant.scoring_config,
      campaignReportOverrides: input.campaignReportOverrides,
    }) as Record<string, unknown>,
    reportConfig: resolveVariantReportConfig({
      variantReportConfig: input.variant.report_config,
      campaignReportOverrides: input.campaignReportOverrides,
    }) as Record<string, unknown>,
  } satisfies SubmissionDefaultReportSnapshot
}

function isPublishedVariant(
  variant: AssessmentReportVariantRecord | null | undefined
): variant is AssessmentReportVariantRecord {
  return Boolean(variant && variant.status === 'published')
}

async function getSubmissionSelectionContext(
  adminClient: SupabaseClient,
  submissionId: string
): Promise<SubmissionSelectionContext | null> {
  const { data, error } = await adminClient
    .from('assessment_submissions')
    .select('id, assessment_id, campaign_id, default_report_snapshot')
    .eq('id', submissionId)
    .maybeSingle()

  if (error || !data?.id || !data.assessment_id) {
    return null
  }

  return {
    submissionId: data.id as string,
    assessmentId: data.assessment_id as string,
    campaignId: (data.campaign_id as string | null) ?? null,
    defaultSnapshot: normalizeSubmissionDefaultReportSnapshot(data.default_report_snapshot),
  }
}

async function getAssessmentSeedContext(
  adminClient: SupabaseClient,
  assessmentId: string
): Promise<AssessmentSeedContext | null> {
  const { data, error } = await adminClient
    .from('assessments')
    .select('id, key, name, scoring_config, report_config, created_by')
    .eq('id', assessmentId)
    .maybeSingle()

  if (error || !data?.id || !data.key || !data.name) {
    return null
  }

  return data as AssessmentSeedContext
}

async function getReportDefinitionsByKeys(
  adminClient: SupabaseClient,
  keys: ReportDefinitionKey[]
) {
  const { data, error } = await adminClient
    .from('report_definitions')
    .select('id, key, name, description, renderer_type, status, compatibility_rules')
    .in('key', keys)

  if (error) {
    return new Map<ReportDefinitionKey, ReportDefinitionRecord>()
  }

  return new Map(
    ((data ?? []) as ReportDefinitionRecord[]).map((definition) => [definition.key, definition])
  )
}

async function getDefaultScoringModelId(
  adminClient: SupabaseClient,
  assessmentId: string
) {
  const { data, error } = await adminClient
    .from('assessment_scoring_models')
    .select('id')
    .eq('assessment_id', assessmentId)
    .eq('is_default', true)
    .limit(1)
    .maybeSingle()

  if (error || !data?.id) {
    return null
  }

  return data.id as string
}

async function getCampaignAssessmentReportContext(input: {
  adminClient: SupabaseClient
  assessmentId: string
  campaignId: string
}): Promise<CampaignAssessmentReportContext | null> {
  const { data, error } = await input.adminClient
    .from('campaign_assessments')
    .select('report_overrides, report_delivery_config')
    .eq('campaign_id', input.campaignId)
    .eq('assessment_id', input.assessmentId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    reportOverrides: normalizeCampaignAssessmentReportOverrides(data.report_overrides),
    deliveryConfig: normalizeCampaignAssessmentReportDeliveryConfig(
      data.report_delivery_config,
      data.report_overrides
    ),
  }
}

export async function ensureSeededAssessmentReportVariants(input: {
  adminClient: SupabaseClient
  assessmentId: string
}) {
  const { data: existingRows, error: existingError } = await input.adminClient
    .from('assessment_report_variants')
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

  const definitionsByKey = await getReportDefinitionsByKeys(input.adminClient, [
    'generic_assessment',
    'ai_orientation',
  ])
  const genericDefinition = definitionsByKey.get('generic_assessment') ?? null
  const aiDefinition = definitionsByKey.get('ai_orientation') ?? null

  if (!genericDefinition && !aiDefinition) {
    return { created: false as const }
  }

  const genericCompatibility = genericDefinition
    ? resolveReportDefinitionCompatibility({
        definitionKey: genericDefinition.key,
        assessmentKey: assessment.key,
        scoringConfig: assessment.scoring_config,
      })
    : null
  const aiCompatibility = aiDefinition
    ? resolveReportDefinitionCompatibility({
        definitionKey: aiDefinition.key,
        assessmentKey: assessment.key,
        scoringConfig: assessment.scoring_config,
      })
    : null

  const shouldSeedAiOrientationDefault =
    isAiOrientationSeedAssessmentKey(assessment.key)
    && Boolean(aiDefinition)
    && Boolean(aiCompatibility?.compatible)
  const defaultScoringModelId = await getDefaultScoringModelId(input.adminClient, assessment.id)
  const nowIso = new Date().toISOString()
  const rows: Array<Record<string, unknown>> = []

  if (genericDefinition) {
    rows.push({
      assessment_id: assessment.id,
      report_definition_id: genericDefinition.id,
      variant_key: 'default_assessment_report',
      name: shouldSeedAiOrientationDefault ? 'Generic assessment report' : 'Default assessment report',
      version: 1,
      status: genericCompatibility?.compatible ? 'published' : 'draft',
      is_default: !shouldSeedAiOrientationDefault && Boolean(genericCompatibility?.compatible),
      scoring_model_id: defaultScoringModelId,
      scoring_config: assessment.scoring_config ?? {},
      report_config: assessment.report_config ?? {},
      compatibility_snapshot: {
        compatible: genericCompatibility?.compatible ?? false,
        reason: genericCompatibility?.reason ?? 'Assessment compatibility could not be evaluated.',
      },
      created_by: assessment.created_by,
      updated_at: nowIso,
    })
  }

  if (shouldSeedAiOrientationDefault && aiDefinition) {
    rows.push({
      assessment_id: assessment.id,
      report_definition_id: aiDefinition.id,
      variant_key: 'ai_orientation_report',
      name: 'AI orientation report',
      version: 1,
      status: 'published',
      is_default: true,
      scoring_model_id: defaultScoringModelId,
      scoring_config: assessment.scoring_config ?? {},
      report_config: assessment.report_config ?? {},
      compatibility_snapshot: {
        compatible: aiCompatibility?.compatible ?? false,
        reason: aiCompatibility?.reason ?? 'Assessment compatibility could not be evaluated.',
      },
      created_by: assessment.created_by,
      updated_at: nowIso,
    })
  }

  if (rows.length === 0) {
    return { created: false as const }
  }

  const { error } = await input.adminClient
    .from('assessment_report_variants')
    .insert(rows)

  return {
    created: !error,
  }
}

async function getPublishedVariantById(
  adminClient: SupabaseClient,
  assessmentId: string,
  variantId: string
): Promise<{ variant: AssessmentReportVariantRecord; definition: ReportDefinitionRecord } | null> {
  const { data, error } = await adminClient
    .from('assessment_report_variants')
    .select(
      'id, assessment_id, report_definition_id, variant_key, name, version, status, is_default, scoring_model_id, scoring_config, report_config, compatibility_snapshot, report_definitions(id, key, name, description, renderer_type, status, compatibility_rules)'
    )
    .eq('assessment_id', assessmentId)
    .eq('id', variantId)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const row = data as AssessmentReportVariantRow
  const definition = pickRelation(row.report_definitions)
  if (!definition) {
    return null
  }

  return {
    variant: {
      id: row.id,
      assessment_id: row.assessment_id,
      report_definition_id: row.report_definition_id,
      variant_key: row.variant_key,
      name: row.name,
      version: row.version,
      status: row.status,
      is_default: row.is_default,
      scoring_model_id: row.scoring_model_id ?? null,
      scoring_config: row.scoring_config,
      report_config: row.report_config,
      compatibility_snapshot: row.compatibility_snapshot,
    },
    definition,
  }
}

export async function listPublishedAssessmentReportVariants(input: {
  adminClient: SupabaseClient
  assessmentId: string
}): Promise<Array<{ variant: AssessmentReportVariantRecord; definition: ReportDefinitionRecord }>> {
  await ensureSeededAssessmentReportVariants(input)

  const { data, error } = await input.adminClient
    .from('assessment_report_variants')
    .select(
      'id, assessment_id, report_definition_id, variant_key, name, version, status, is_default, scoring_model_id, scoring_config, report_config, compatibility_snapshot, report_definitions(id, key, name, description, renderer_type, status, compatibility_rules)'
    )
    .eq('assessment_id', input.assessmentId)
    .eq('status', 'published')
    .order('is_default', { ascending: false })
    .order('name')

  if (error) {
    return []
  }

  return ((data ?? [])
    .map((row) => {
      const typed = row as AssessmentReportVariantRow
      const definition = pickRelation(typed.report_definitions)
      if (!definition) {
        return null
      }

      return {
        variant: {
          id: typed.id,
          assessment_id: typed.assessment_id,
          report_definition_id: typed.report_definition_id,
          variant_key: typed.variant_key,
          name: typed.name,
          version: typed.version,
          status: typed.status,
          is_default: typed.is_default,
          scoring_model_id: typed.scoring_model_id ?? null,
          scoring_config: typed.scoring_config,
          report_config: typed.report_config,
          compatibility_snapshot: typed.compatibility_snapshot,
        } satisfies AssessmentReportVariantRecord,
        definition,
      }
    })
    .filter(Boolean)) as Array<{ variant: AssessmentReportVariantRecord; definition: ReportDefinitionRecord }>
}

export async function resolveCampaignDefaultReportVariant(input: {
  adminClient: SupabaseClient
  assessmentId: string
  campaignId: string
}) {
  const context = await getCampaignAssessmentReportContext(input)
  if (!context) {
    return null
  }

  const variantId = context.deliveryConfig.public_default_report_variant_id?.trim() || ''
  if (!variantId) {
    return null
  }

  const resolved = await getPublishedVariantById(input.adminClient, input.assessmentId, variantId)
  if (!resolved) {
    return null
  }

  return {
    ...resolved,
    campaignReportOverrides: context.reportOverrides,
    campaignReportDeliveryConfig: context.deliveryConfig,
  }
}

export async function resolveAssessmentDefaultReportVariant(input: {
  adminClient: SupabaseClient
  assessmentId: string
}) {
  await ensureSeededAssessmentReportVariants(input)

  const { data, error } = await input.adminClient
    .from('assessment_report_variants')
    .select(
      'id, assessment_id, report_definition_id, variant_key, name, version, status, is_default, scoring_model_id, scoring_config, report_config, compatibility_snapshot, report_definitions(id, key, name, description, renderer_type, status, compatibility_rules)'
    )
    .eq('assessment_id', input.assessmentId)
    .eq('status', 'published')
    .eq('is_default', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const row = data as AssessmentReportVariantRow
  const definition = pickRelation(row.report_definitions)
  if (!definition) {
    return null
  }

  return {
    variant: {
      id: row.id,
      assessment_id: row.assessment_id,
      report_definition_id: row.report_definition_id,
      variant_key: row.variant_key,
      name: row.name,
      version: row.version,
      status: row.status,
      is_default: row.is_default,
      scoring_model_id: row.scoring_model_id ?? null,
      scoring_config: row.scoring_config,
      report_config: row.report_config,
      compatibility_snapshot: row.compatibility_snapshot,
    } satisfies AssessmentReportVariantRecord,
    definition,
  }
}

export async function resolveSubmissionReportSelection(input: {
  adminClient: SupabaseClient
  submissionId: string
  selectionMode?: ReportSelectionMode | null
  reportVariantId?: string | null
}): Promise<ResolvedSubmissionReportSelection | null> {
  const context = await getSubmissionSelectionContext(input.adminClient, input.submissionId)
  if (!context) {
    return null
  }

  const selectionMode = input.selectionMode ?? null
  const requestedVariantId = input.reportVariantId?.trim() || null

  if (selectionMode === 'frozen_default' || (!selectionMode && context.defaultSnapshot)) {
    const snapshot = context.defaultSnapshot
    if (!snapshot) {
      return null
    }

    return {
      submissionId: context.submissionId,
      assessmentId: context.assessmentId,
      campaignId: context.campaignId,
      selectionMode: 'frozen_default',
      reportVariantId: snapshot.variantId,
      definitionKey: snapshot.definitionKey,
      rendererType: snapshot.rendererType,
      variantName: snapshot.variantName,
      scoringConfig: snapshot.scoringConfig,
      reportConfig: snapshot.reportConfig,
    }
  }

  if (selectionMode === 'latest_variant' && requestedVariantId) {
    const resolved = await getPublishedVariantById(
      input.adminClient,
      context.assessmentId,
      requestedVariantId
    )
    if (!resolved) {
      return null
    }

    const campaignContext = context.campaignId
      ? await getCampaignAssessmentReportContext({
          adminClient: input.adminClient,
          assessmentId: context.assessmentId,
          campaignId: context.campaignId,
        })
      : null

    return {
      submissionId: context.submissionId,
      assessmentId: context.assessmentId,
      campaignId: context.campaignId,
      selectionMode: 'latest_variant',
      reportVariantId: resolved.variant.id,
      definitionKey: resolved.definition.key,
      rendererType: resolved.definition.renderer_type,
      variantName: resolved.variant.name,
      scoringConfig: resolveVariantScoringConfig({
        variantScoringConfig: resolved.variant.scoring_config,
        campaignReportOverrides: campaignContext?.reportOverrides,
      }) as Record<string, unknown>,
      reportConfig: resolveVariantReportConfig({
        variantReportConfig: resolved.variant.report_config,
        campaignReportOverrides: campaignContext?.reportOverrides,
      }) as Record<string, unknown>,
    }
  }

  if ((selectionMode === 'latest_campaign_default' || !selectionMode) && context.campaignId) {
    const resolvedCampaignDefault = await resolveCampaignDefaultReportVariant({
      adminClient: input.adminClient,
      assessmentId: context.assessmentId,
      campaignId: context.campaignId,
    })

    if (resolvedCampaignDefault) {
      return {
        submissionId: context.submissionId,
        assessmentId: context.assessmentId,
        campaignId: context.campaignId,
        selectionMode: 'latest_campaign_default',
        reportVariantId: resolvedCampaignDefault.variant.id,
        definitionKey: resolvedCampaignDefault.definition.key,
        rendererType: resolvedCampaignDefault.definition.renderer_type,
        variantName: resolvedCampaignDefault.variant.name,
        scoringConfig: resolveVariantScoringConfig({
          variantScoringConfig: resolvedCampaignDefault.variant.scoring_config,
          campaignReportOverrides: resolvedCampaignDefault.campaignReportOverrides,
        }) as Record<string, unknown>,
        reportConfig: resolveVariantReportConfig({
          variantReportConfig: resolvedCampaignDefault.variant.report_config,
          campaignReportOverrides: resolvedCampaignDefault.campaignReportOverrides,
        }) as Record<string, unknown>,
      }
    }
  }

  const resolvedAssessmentDefault = await resolveAssessmentDefaultReportVariant({
    adminClient: input.adminClient,
    assessmentId: context.assessmentId,
  })
  if (!resolvedAssessmentDefault) {
    return null
  }

  return {
    submissionId: context.submissionId,
    assessmentId: context.assessmentId,
    campaignId: context.campaignId,
    selectionMode: 'latest_variant',
    reportVariantId: resolvedAssessmentDefault.variant.id,
    definitionKey: resolvedAssessmentDefault.definition.key,
    rendererType: resolvedAssessmentDefault.definition.renderer_type,
    variantName: resolvedAssessmentDefault.variant.name,
    scoringConfig: resolveVariantScoringConfig({
      variantScoringConfig: resolvedAssessmentDefault.variant.scoring_config,
    }) as Record<string, unknown>,
    reportConfig: resolveVariantReportConfig({
      variantReportConfig: resolvedAssessmentDefault.variant.report_config,
    }) as Record<string, unknown>,
  }
}

export async function listSubmissionReportOptions(input: {
  adminClient: SupabaseClient
  submissionId: string
}) {
  const context = await getSubmissionSelectionContext(input.adminClient, input.submissionId)
  if (!context) {
    return []
  }

  const options: SubmissionReportOption[] = []
  const currentDefaultVariantIds = new Set<string>()
  const addedVariantIds = new Set<string>()
  const publishedVariants = await listPublishedAssessmentReportVariants({
    adminClient: input.adminClient,
    assessmentId: context.assessmentId,
  })
  const campaignContext = context.campaignId
    ? await getCampaignAssessmentReportContext({
        adminClient: input.adminClient,
        assessmentId: context.assessmentId,
        campaignId: context.campaignId,
      })
    : null
  const allowedInternalVariantIds = new Set(
    campaignContext?.deliveryConfig.internal_allowed_report_variant_ids ?? []
  )

  if (context.defaultSnapshot) {
    options.push({
      key: 'frozen_default',
      label: 'Delivered at completion',
      description: `${context.defaultSnapshot.variantName} v${context.defaultSnapshot.version}`,
      selectionMode: 'frozen_default',
      reportVariantId: context.defaultSnapshot.variantId,
      currentDefault: false,
    })
  }

  if (context.campaignId) {
    const campaignDefault = await resolveCampaignDefaultReportVariant({
      adminClient: input.adminClient,
      assessmentId: context.assessmentId,
      campaignId: context.campaignId,
    })

    if (campaignDefault && isPublishedVariant(campaignDefault.variant)) {
      currentDefaultVariantIds.add(campaignDefault.variant.id)
      addedVariantIds.add(campaignDefault.variant.id)
      options.push({
        key: 'latest_campaign_default',
        label: 'Candidate-facing default',
        description: `${campaignDefault.variant.name} (${campaignDefault.definition.name})`,
        selectionMode: 'latest_campaign_default',
        reportVariantId: campaignDefault.variant.id,
        currentDefault: true,
      })
    }
  }

  for (const { variant, definition } of publishedVariants) {
    if (context.campaignId && !allowedInternalVariantIds.has(variant.id) && !currentDefaultVariantIds.has(variant.id)) {
      continue
    }
    if (addedVariantIds.has(variant.id)) {
      continue
    }

    options.push({
      key: `variant:${variant.id}`,
      label: context.campaignId ? `Internal: ${variant.name}` : variant.name,
      description: `${definition.name} • v${variant.version}`,
      selectionMode: 'latest_variant',
      reportVariantId: variant.id,
      currentDefault: currentDefaultVariantIds.has(variant.id) || (!context.campaignId && variant.is_default),
    })
  }

  return options
}

export async function listCompatibleReportDefinitions(input: {
  adminClient: SupabaseClient
  assessmentId: string
}) {
  const { data: assessment } = await input.adminClient
    .from('assessments')
    .select('key, scoring_config')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (!assessment) {
    return []
  }

  const { data: definitions } = await input.adminClient
    .from('report_definitions')
    .select('id, key, name, description, renderer_type, status, compatibility_rules')
    .order('name')

  return (definitions ?? []).map((definition) => {
    const typed = definition as ReportDefinitionRecord
    return {
      ...typed,
      compatibility: resolveReportDefinitionCompatibility({
        definitionKey: typed.key,
        assessmentKey: (assessment.key as string | null) ?? null,
        scoringConfig: assessment.scoring_config,
      }),
    } satisfies ReportDefinitionWithCompatibility
  })
}
