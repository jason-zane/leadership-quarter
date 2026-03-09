import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import {
  normalizeReportCompetencyOverrides,
  type ReportCompetencyOverride,
  type ReportCompetencyOverrides,
} from '@/utils/assessments/experience-config'

export type ReportCompetencyDefinition = {
  key: string
  internalLabel: string
  defaultDescription: string | null
}

export type CampaignAssessmentReportOverrides = {
  competency_overrides: ReportCompetencyOverrides
}

const DEFAULT_CAMPAIGN_ASSESSMENT_REPORT_OVERRIDES: CampaignAssessmentReportOverrides = {
  competency_overrides: {},
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

  if (!label && !description) {
    return null
  }

  return {
    ...(label ? { label } : {}),
    ...(description ? { description } : {}),
  }
}
