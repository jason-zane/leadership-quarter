import type { AssessmentReportData } from '@/utils/reports/assessment-report'
import type { V2SubmissionReportData } from '@/utils/assessments/v2-runtime'
import type { V2BlockDataSource, V2ReportBlockDefinition } from '@/utils/assessments/v2-report-template'
import { slugifyKey } from '@/utils/assessments/v2-question-bank'
import {
  getBandingConfig,
  getDerivedOutcomeSet,
  normalizeV2ScoringConfig,
  resolveDerivedOutcome,
  type V2DerivedOutcome,
  type V2DerivedOutcomeSet,
  type V2ScoringConfig,
  type V2ScoringLevel,
} from '@/utils/assessments/v2-scoring'
import { getV2PreviewItems, getV2PreviewSample } from '@/utils/reports/v2-preview-samples'

export type V2BlockResolvedItem = {
  key: string
  label: string
  value?: number
  band?: string
  description?: string
}

export type V2BlockResolvedData = {
  source: V2BlockDataSource
  items: V2BlockResolvedItem[]
  classification?: { key: string; label: string; description: string }
  derivedOutcome?: {
    key: string
    label: string
    description: string
    summary: string
    narrative: string
    recommendations: string[]
  }
  markdown?: string
}

export type V2BlockDataResolver = (
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
) => V2BlockResolvedData | null

export type V2ReportDataContext = {
  assessmentId: string
  submissionId?: string
  sampleProfileId?: string
  scoringConfig?: V2ScoringConfig | unknown
  assessmentReport?: AssessmentReportData | null
  v2Report?: V2SubmissionReportData | null
}

function getNormalizedScoringConfig(context: V2ReportDataContext) {
  return context.scoringConfig ? normalizeV2ScoringConfig(context.scoringConfig) : null
}

function getSampleClassification(context: V2ReportDataContext) {
  return getV2PreviewSample(context.sampleProfileId).classification
}

function getSampleStaticContent(context: V2ReportDataContext) {
  if (context.v2Report?.static_content) {
    return context.v2Report.static_content
  }

  return getV2PreviewSample(context.sampleProfileId).static_content
}

function getPreviewItems(
  context: V2ReportDataContext,
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content'>
) {
  return getV2PreviewItems(context.sampleProfileId, source)
}

function clampItems(items: V2BlockResolvedItem[], maxItems?: number) {
  if (!maxItems || maxItems <= 0) return items
  return items.slice(0, maxItems)
}

function normalizeReportKey(value: string | null | undefined) {
  return slugifyKey(value ?? '', 'item')
}

function filterItems(items: V2BlockResolvedItem[], block: V2ReportBlockDefinition) {
  const include = new Set(block.filter?.include_keys ?? [])
  const exclude = new Set(block.filter?.exclude_keys ?? [])
  const filtered = items.filter((item) => {
    if (include.size > 0 && !include.has(item.key)) return false
    if (exclude.has(item.key)) return false
    return true
  })
  return clampItems(filtered, block.filter?.max_items)
}

function buildDimensionItemsFromAssessmentReport(report: AssessmentReportData): V2BlockResolvedItem[] {
  return report.dimensionProfiles.map((profile) => {
    const dimension = report.dimensions.find((item) => item.key === profile.key)
    return {
      key: profile.key,
      label: profile.label,
      value: profile.score,
      band: dimension?.descriptor ?? undefined,
      description: dimension?.bandMeaning ?? profile.description ?? undefined,
    }
  })
}

function buildTraitItemsFromAssessmentReport(report: AssessmentReportData): V2BlockResolvedItem[] {
  return report.traitProfiles.map((profile) => ({
    key: profile.key,
    label: profile.label,
    value: profile.score,
    band: report.traitScores.find((item) => item.traitCode === profile.key)?.band ?? undefined,
    description: profile.description ?? undefined,
  }))
}

function buildInterpretationItemsFromAssessmentReport(report: AssessmentReportData): V2BlockResolvedItem[] {
  return report.interpretations.map((item, index) => ({
    key: `${item.ruleType}_${index + 1}`,
    label: item.title ?? 'Insight',
    description: item.body,
  }))
}

function buildRecommendationItemsFromAssessmentReport(report: AssessmentReportData): V2BlockResolvedItem[] {
  return report.recommendations.map((item, index) => ({
    key: `recommendation_${index + 1}`,
    label: `Recommendation ${index + 1}`,
    description: item,
  }))
}

function getV2ReportItems(
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content'>,
  context: V2ReportDataContext
): V2BlockResolvedItem[] | null {
  const report = context.v2Report
  if (!report) return null

  if (source === 'dimension_scores') {
    return report.dimension_scores.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      band: item.band,
    }))
  }
  if (source === 'competency_scores') {
    return report.competency_scores.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      band: item.band,
    }))
  }
  if (source === 'trait_scores') {
    return report.trait_scores.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      band: item.band,
    }))
  }
  if (source === 'interpretations') {
    return report.interpretations.map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description,
    }))
  }
  if (source === 'recommendations') {
    return report.recommendations.map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description,
    }))
  }

  return []
}

function getReportItems(
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content'>,
  context: V2ReportDataContext
): V2BlockResolvedItem[] | null {
  const v2ReportItems = getV2ReportItems(source, context)
  if (v2ReportItems) return v2ReportItems

  const report = context.assessmentReport
  if (!report) return null

  if (source === 'dimension_scores') return buildDimensionItemsFromAssessmentReport(report)
  if (source === 'trait_scores') return buildTraitItemsFromAssessmentReport(report)
  if (source === 'interpretations') return buildInterpretationItemsFromAssessmentReport(report)
  if (source === 'recommendations') return buildRecommendationItemsFromAssessmentReport(report)

  return []
}

function getSourceItems(
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content'>,
  context: V2ReportDataContext
) {
  return getReportItems(source, context) ?? getPreviewItems(context, source)
}

function normalizeBandKey(
  config: V2ScoringConfig,
  level: V2ScoringLevel,
  targetKey: string,
  bandValue: string | null | undefined
) {
  if (!bandValue) return null

  const normalizedValue = bandValue.trim().toLowerCase()
  const bands = getBandingConfig(config, level, targetKey).bands
  const match = bands.find((band) => {
    return band.id.toLowerCase() === normalizedValue || band.label.trim().toLowerCase() === normalizedValue
  })

  return match?.id ?? null
}

function findItemBandSelection(
  config: V2ScoringConfig,
  outcomeSet: V2DerivedOutcomeSet,
  context: V2ReportDataContext
) {
  const sourceName =
    outcomeSet.level === 'dimension'
      ? 'dimension_scores'
      : outcomeSet.level === 'competency'
        ? 'competency_scores'
        : 'trait_scores'
  const items = getSourceItems(sourceName, context)

  const selection: Record<string, string> = {}
  for (const targetKey of outcomeSet.targetKeys) {
    const normalizedTargetKey = normalizeReportKey(targetKey)
    const reportBand = context.assessmentReport?.bands[targetKey]
      ?? context.assessmentReport?.bands[normalizedTargetKey]
    const matchingItem = items.find((item: V2BlockResolvedItem) => normalizeReportKey(item.key) === normalizedTargetKey)
    const fallbackBand = matchingItem && 'band' in matchingItem && typeof matchingItem.band === 'string'
      ? matchingItem.band
      : undefined
    const bandKey = normalizeBandKey(
      config,
      outcomeSet.level,
      targetKey,
      reportBand ?? fallbackBand
    )
    if (!bandKey) return null
    selection[targetKey] = bandKey
  }

  return selection
}

function toDerivedOutcomeData(outcome: V2DerivedOutcome) {
  const description = outcome.shortDescription || outcome.reportSummary || outcome.fullNarrative
  return {
    key: outcome.key,
    label: outcome.label,
    description,
    summary: outcome.reportSummary || outcome.shortDescription,
    narrative: outcome.fullNarrative || outcome.reportSummary || outcome.shortDescription,
    recommendations: outcome.recommendations,
  }
}

function resolveOutcomeForBlock(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
) {
  const scoringConfig = getNormalizedScoringConfig(context)
  if (!scoringConfig) return null

  const outcomeSetKey = block.filter?.outcome_set_key ?? scoringConfig.derivedOutcomes[0]?.key
  if (!outcomeSetKey) return null

  const outcomeSet = getDerivedOutcomeSet(scoringConfig, outcomeSetKey)
  if (!outcomeSet) return null

  const bandSelection = findItemBandSelection(scoringConfig, outcomeSet, context)
  if (!bandSelection) return null

  const resolution = resolveDerivedOutcome(scoringConfig, outcomeSet, bandSelection)
  if (resolution.status !== 'matched') return null

  const sourceName =
    outcomeSet.level === 'dimension'
      ? 'dimension_scores'
      : outcomeSet.level === 'competency'
        ? 'competency_scores'
        : 'trait_scores'
  const sourceItems = getSourceItems(sourceName, context)

  return {
    outcomeSet,
    outcome: resolution.outcome,
    inputs: outcomeSet.targetKeys.map((targetKey) => {
      const normalizedTargetKey = normalizeReportKey(targetKey)
      const sourceItem = sourceItems.find((item) => normalizeReportKey(item.key) === normalizedTargetKey)
      const band = getBandingConfig(scoringConfig, outcomeSet.level, targetKey).bands.find(
        (item) => item.id === bandSelection[targetKey]
      )
      return {
        key: sourceItem?.key ?? targetKey,
        label: sourceItem?.label ?? targetKey,
        band: band?.label ?? bandSelection[targetKey],
        description: band?.meaning ?? '',
      }
    }),
  }
}

function resolveOverallClassification(
  _block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  if (context.v2Report?.classification) {
    return {
      source: 'overall_classification',
      items: [],
      classification: context.v2Report.classification,
    }
  }

  const report = context.assessmentReport
  const classification = report?.classification?.label
    ? {
        key: report.classification.key ?? '',
        label: report.classification.label,
        description: report.classification.description ?? '',
      }
    : getSampleClassification(context)

  return {
    source: 'overall_classification',
    items: [],
    classification,
  }
}

function resolveDerivedOutcomeBlock(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData | null {
  const resolved = resolveOutcomeForBlock(block, context)
  if (!resolved) return null

  const derivedOutcome = toDerivedOutcomeData(resolved.outcome)
  return {
    source: 'derived_outcome',
    items: filterItems(resolved.inputs, block),
    classification: {
      key: derivedOutcome.key,
      label: derivedOutcome.label,
      description: derivedOutcome.description,
    },
    derivedOutcome,
  }
}

function resolveScores(
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content'>,
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  return {
    source,
    items: filterItems(getSourceItems(source, context), block),
  }
}

function resolveInterpretations(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  return {
    source: 'interpretations',
    items: filterItems(getSourceItems('interpretations', context), block),
  }
}

function resolveRecommendations(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  const resolvedOutcome = resolveOutcomeForBlock(block, context)
  if (resolvedOutcome) {
    return {
      source: 'recommendations',
      items: filterItems(
        resolvedOutcome.outcome.recommendations.map((item, index) => ({
          key: `recommendation_${index + 1}`,
          label: `Recommendation ${index + 1}`,
          description: item,
        })),
        block
      ),
      derivedOutcome: toDerivedOutcomeData(resolvedOutcome.outcome),
    }
  }

  return {
    source: 'recommendations',
    items: filterItems(getSourceItems('recommendations', context), block),
  }
}

function resolveStaticContent(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  return {
    source: 'static_content',
    items: [],
    markdown: block.content?.body_markdown ?? getSampleStaticContent(context),
  }
}

const BLOCK_DATA_RESOLVERS: Record<V2BlockDataSource, V2BlockDataResolver> = {
  overall_classification: (block, context) => resolveOverallClassification(block, context),
  derived_outcome: (block, context) => resolveDerivedOutcomeBlock(block, context),
  dimension_scores: (block, context) => resolveScores('dimension_scores', block, context),
  competency_scores: (block, context) => resolveScores('competency_scores', block, context),
  trait_scores: (block, context) => resolveScores('trait_scores', block, context),
  interpretations: (block, context) => resolveInterpretations(block, context),
  recommendations: (block, context) => resolveRecommendations(block, context),
  static_content: (block, context) => resolveStaticContent(block, context),
}

export function resolveBlockData(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData | null {
  const resolver = BLOCK_DATA_RESOLVERS[block.source]
  if (!resolver) return null
  return resolver(block, context)
}
