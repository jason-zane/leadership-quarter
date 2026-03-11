import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import {
  normalizeReportCompetencyOverrides,
  normalizeReportTraitOverrides,
  type ReportCompetencyOverride,
  type ReportCompetencyOverrides,
  type ReportTraitOverride,
  type ReportTraitOverrides,
} from '@/utils/assessments/experience-config'

export type ReportProfileDefinition = {
  key: string
  internalLabel: string
  defaultDescription: string | null
}

export type ReportCompetencyDefinition = ReportProfileDefinition
export type ReportTraitDefinition = ReportProfileDefinition

export type CampaignAssessmentReportOverrides = {
  competency_overrides: ReportCompetencyOverrides
  default_report_variant_id: string | null
  report_variant_overrides: Record<string, unknown>
}

export type CampaignAssessmentReportDeliveryConfig = {
  public_default_report_variant_id: string | null
  internal_allowed_report_variant_ids: string[]
}

const DEFAULT_CAMPAIGN_ASSESSMENT_REPORT_OVERRIDES: CampaignAssessmentReportOverrides = {
  competency_overrides: {},
  default_report_variant_id: null,
  report_variant_overrides: {},
}

const DEFAULT_CAMPAIGN_ASSESSMENT_REPORT_DELIVERY_CONFIG: CampaignAssessmentReportDeliveryConfig = {
  public_default_report_variant_id: null,
  internal_allowed_report_variant_ids: [],
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeCampaignAssessmentReportOverrides(
  value: unknown
): CampaignAssessmentReportOverrides {
  if (!isObject(value)) {
    return DEFAULT_CAMPAIGN_ASSESSMENT_REPORT_OVERRIDES
  }

  return {
    competency_overrides: normalizeReportCompetencyOverrides(value.competency_overrides),
    default_report_variant_id:
      typeof value.default_report_variant_id === 'string' && value.default_report_variant_id.trim()
        ? value.default_report_variant_id.trim()
        : null,
    report_variant_overrides: isObject(value.report_variant_overrides)
      ? value.report_variant_overrides
      : {},
  }
}

function normalizeVariantIdList(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return [...new Set(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  )]
}

export function normalizeCampaignAssessmentReportDeliveryConfig(
  value: unknown,
  legacyOverrides?: unknown
): CampaignAssessmentReportDeliveryConfig {
  const legacy = normalizeCampaignAssessmentReportOverrides(legacyOverrides)

  if (!isObject(value)) {
    return {
      ...DEFAULT_CAMPAIGN_ASSESSMENT_REPORT_DELIVERY_CONFIG,
      public_default_report_variant_id: legacy.default_report_variant_id,
    }
  }

  const publicDefault =
    typeof value.public_default_report_variant_id === 'string' && value.public_default_report_variant_id.trim()
      ? value.public_default_report_variant_id.trim()
      : legacy.default_report_variant_id

  return {
    public_default_report_variant_id: publicDefault,
    internal_allowed_report_variant_ids: normalizeVariantIdList(value.internal_allowed_report_variant_ids),
  }
}

export function getReportCompetencyDefinitions(
  scoringConfig: unknown
): ReportCompetencyDefinition[] {
  return normalizeScoringConfig(scoringConfig).dimensions.map((dimension) => ({
    key: dimension.key,
    internalLabel: dimension.label,
    defaultDescription: dimension.description ?? null,
  }))
}

export function getReportTraitDefinitions(
  traits: Array<{
    code?: string | null
    external_name?: string | null
    name?: string | null
    description?: string | null
  }> | null | undefined
): ReportTraitDefinition[] {
  return (traits ?? [])
    .map((trait) => {
      const key = trait.code?.trim() ?? ''
      if (!key) return null

      return {
        key,
        internalLabel: trait.external_name?.trim() || trait.name?.trim() || key,
        defaultDescription: trait.description?.trim() || null,
      }
    })
    .filter((trait): trait is ReportTraitDefinition => trait !== null)
}

export function resolveReportCompetencyOverride(input: {
  dimensionKey: string
  assessmentOverrides?: ReportCompetencyOverrides | null
  campaignOverrides?: ReportCompetencyOverrides | null
}): ReportCompetencyOverride | null {
  const assessmentOverride = input.assessmentOverrides?.[input.dimensionKey] ?? null
  const campaignOverride = input.campaignOverrides?.[input.dimensionKey] ?? null

  const label = campaignOverride?.label?.trim() || assessmentOverride?.label?.trim() || ''
  const description =
    campaignOverride?.description?.trim()
    || assessmentOverride?.description?.trim()
    || ''
  const lowAnchor =
    campaignOverride?.low_anchor?.trim()
    || assessmentOverride?.low_anchor?.trim()
    || ''
  const highAnchor =
    campaignOverride?.high_anchor?.trim()
    || assessmentOverride?.high_anchor?.trim()
    || ''

  if (!label && !description && !lowAnchor && !highAnchor) {
    return null
  }

  return {
    ...(label ? { label } : {}),
    ...(description ? { description } : {}),
    ...(lowAnchor ? { low_anchor: lowAnchor } : {}),
    ...(highAnchor ? { high_anchor: highAnchor } : {}),
  }
}

export function resolveReportTraitOverride(input: {
  traitKey: string
  assessmentOverrides?: ReportTraitOverrides | null
}): ReportTraitOverride | null {
  const normalized = normalizeReportTraitOverrides(input.assessmentOverrides)
  const override = normalized[input.traitKey] ?? null

  if (!override) {
    return null
  }

  return override
}
