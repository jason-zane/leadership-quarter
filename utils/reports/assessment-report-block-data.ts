import type { AssessmentReportData } from '@/utils/reports/assessment-report'
import type { V2SubmissionReportData } from '@/utils/assessments/assessment-runtime-model'
import type { V2BlockDataSource, V2ReportBlockDefinition } from '@/utils/assessments/assessment-report-template'
import { normalizeV2QuestionBank, slugifyKey, type V2QuestionBank } from '@/utils/assessments/assessment-question-bank'
import {
  getBandingConfig,
  getDerivedOutcomeSet,
  getArchetypeSet,
  getInterpretationContent,
  normalizeV2ScoringConfig,
  resolveArchetype,
  resolveDerivedOutcome,
  type V2DerivedOutcome,
  type V2DerivedOutcomeSet,
  type V2ScoringConfig,
  type V2ScoringLevel,
} from '@/utils/assessments/assessment-scoring'
import { getV2PreviewItems, getV2PreviewSample } from '@/utils/reports/assessment-report-preview-samples'

export type V2BlockResolvedItem = {
  key: string
  label: string
  value?: number
  rawValue?: number
  displayValue?: number
  displayMin?: number
  displayMax?: number
  stenValue?: number | null
  percentileValue?: number | null
  band?: string
  bandKey?: string
  description?: string
  secondaryDescription?: string
  lowMeaning?: string
  highMeaning?: string
  summaryDefinition?: string
  detailedDefinition?: string
  behaviourHigh?: string
  behaviourMid?: string
  behaviourLow?: string
  currentBehaviour?: string
  metricUnavailable?: boolean
}

export type V2ReportMeta = {
  title: string
  subtitle: string
  participantName: string
  recipientEmail: string | null
  completedAt: string | null
  orgLogoUrl: string | null
  orgName: string | null
  brandingCssOverrides: string
  showLqAttribution?: boolean
  badgeLabel?: string
  showDate?: boolean
  showParticipant?: boolean
  showEmail?: boolean
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
  reportHeader?: V2ReportMeta
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
  questionBank?: V2QuestionBank | unknown
  assessmentReport?: AssessmentReportData | null
  v2Report?: V2SubmissionReportData | null
  reportMeta?: V2ReportMeta
}

function getNormalizedScoringConfig(context: V2ReportDataContext) {
  return context.scoringConfig ? normalizeV2ScoringConfig(context.scoringConfig) : null
}

function getNormalizedQuestionBank(context: V2ReportDataContext) {
  return context.questionBank ? normalizeV2QuestionBank(context.questionBank) : null
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
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content' | 'report_header' | 'report_cta'>
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
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content' | 'report_header' | 'report_cta'>,
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
      rawValue: item.raw_value,
      displayValue: item.display_value,
      displayMin: item.display_min,
      displayMax: item.display_max,
      bandKey: item.band_key,
      stenValue: item.sten_value,
      percentileValue: item.percentile_value,
    }))
  }
  if (source === 'competency_scores') {
    return report.competency_scores.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      band: item.band,
      rawValue: item.raw_value,
      displayValue: item.display_value,
      displayMin: item.display_min,
      displayMax: item.display_max,
      bandKey: item.band_key,
      stenValue: item.sten_value,
      percentileValue: item.percentile_value,
    }))
  }
  if (source === 'trait_scores') {
    return report.trait_scores.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      band: item.band,
      rawValue: item.raw_value,
      displayValue: item.display_value,
      displayMin: item.display_min,
      displayMax: item.display_max,
      bandKey: item.band_key,
      stenValue: item.sten_value,
      percentileValue: item.percentile_value,
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
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content' | 'report_header' | 'report_cta'>,
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
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content' | 'report_header' | 'report_cta'>,
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
      const sourceItem = sourceItems?.find((item: V2BlockResolvedItem) => normalizeReportKey(item.key) === normalizedTargetKey)
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
  if (resolved) {
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

  // Fallback: render classification without derived outcome narrative
  return resolveOverallClassification(block, context)
}

function enrichItemsWithBandMeaning(
  items: V2BlockResolvedItem[],
  level: V2ScoringLevel,
  scoringConfig: V2ScoringConfig
): V2BlockResolvedItem[] {
  return items.map((item) => {
    if (!item.band) return item
    const bands = getBandingConfig(scoringConfig, level, item.key).bands
    const match = bands.find(
      (b) =>
        b.label.trim().toLowerCase() === item.band!.trim().toLowerCase() ||
        b.id.toLowerCase() === item.band!.trim().toLowerCase()
    )
    if (!match) return item
    return {
      ...item,
      description: item.description ?? match.meaning ?? undefined,
      secondaryDescription: match.behaviouralIndicators ?? undefined,
    }
  })
}

function enrichItemsWithInterpretationPoles(
  items: V2BlockResolvedItem[],
  level: V2ScoringLevel,
  scoringConfig: V2ScoringConfig
): V2BlockResolvedItem[] {
  return items.map((item) => {
    const interp = getInterpretationContent(scoringConfig, level, item.key)
    return {
      ...item,
      lowMeaning: interp.lowMeaning || undefined,
      highMeaning: interp.highMeaning || undefined,
    }
  })
}

function resolveScores(
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content' | 'report_header' | 'report_cta'>,
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  const rawItems = filterItems(getSourceItems(source, context), block)
  const scoringConfig = getNormalizedScoringConfig(context)

  let items = rawItems
  if (scoringConfig) {
    const level: V2ScoringLevel =
      source === 'dimension_scores' ? 'dimension' : source === 'competency_scores' ? 'competency' : 'trait'
    items = enrichItemsWithBandMeaning(rawItems, level, scoringConfig)
    if (block.format === 'bipolar_bar') {
      items = enrichItemsWithInterpretationPoles(items, level, scoringConfig)
    }
  }

  return { source, items }
}

function getLayerDefinition(
  questionBank: V2QuestionBank,
  layer: 'dimension' | 'competency' | 'trait',
  key: string
) {
  if (layer === 'dimension') return questionBank.dimensions.find((item) => item.key === key) ?? null
  if (layer === 'competency') return questionBank.competencies.find((item) => item.key === key) ?? null
  return questionBank.traits.find((item) => item.key === key) ?? null
}

function getLayerSourceName(layer: 'dimension' | 'competency' | 'trait'): 'dimension_scores' | 'competency_scores' | 'trait_scores' {
  if (layer === 'dimension') return 'dimension_scores'
  if (layer === 'competency') return 'competency_scores'
  return 'trait_scores'
}

function getNarrativeLevelForItem(
  scoringConfig: V2ScoringConfig | null,
  layer: 'dimension' | 'competency' | 'trait',
  item: V2BlockResolvedItem
): 'low' | 'mid' | 'high' | null {
  if (!scoringConfig) return null
  const banding = getBandingConfig(scoringConfig, layer, item.key)
  const sorted = [...banding.bands].sort((left, right) => left.min - right.min)
  const index = sorted.findIndex((band) => band.id === item.bandKey || band.label === item.band)
  if (index < 0) return null
  if (index === 0) return 'low'
  if (index === sorted.length - 1) return 'high'
  return 'mid'
}

function resolveMetricValue(
  item: V2BlockResolvedItem,
  metricKey: 'display' | 'raw' | 'sten' | 'percentile',
  metricScaleMax?: number
) {
  let sourceValue: number | null = null
  let sourceMin: number | undefined
  let sourceMax: number | undefined

  if (metricKey === 'raw') {
    sourceValue = typeof item.rawValue === 'number' ? item.rawValue : null
  } else if (metricKey === 'sten') {
    sourceValue = typeof item.stenValue === 'number' ? item.stenValue : null
    sourceMin = 1
    sourceMax = 10
  } else if (metricKey === 'percentile') {
    sourceValue = typeof item.percentileValue === 'number' ? item.percentileValue : null
    sourceMin = 0
    sourceMax = 100
  } else {
    sourceValue = typeof item.displayValue === 'number' ? item.displayValue : (typeof item.value === 'number' ? item.value : null)
    sourceMin = item.displayMin
    sourceMax = item.displayMax
  }

  if (sourceValue === null) {
    return { value: undefined, unavailable: true }
  }

  if (metricScaleMax && metricScaleMax > 0 && sourceMin !== undefined && sourceMax !== undefined && sourceMax > sourceMin) {
    const scaled = ((sourceValue - sourceMin) / (sourceMax - sourceMin)) * metricScaleMax
    return { value: Number(scaled.toFixed(2)), unavailable: false }
  }

  return { value: sourceValue, unavailable: false }
}

function resolveLayerProfile(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData | null {
  const questionBank = getNormalizedQuestionBank(context)
  if (!questionBank) return null

  const layer = block.data?.layer ?? 'competency'
  const labelMode = block.data?.label_mode ?? 'external'
  const bodySource = block.data?.body_source ?? 'summary_definition'
  const showBehaviourSnapshot =
    block.data?.show_behaviour_snapshot === true
    || block.data?.behaviour_snapshot_mode === 'current_only'
    || block.data?.behaviour_snapshot_mode === 'low_high_only'
    || block.data?.behaviour_snapshot_mode === 'all_three'
  const behaviourMode = block.data?.behaviour_snapshot_mode ?? 'current_only'
  const metricKey = block.data?.metric_key ?? 'display'
  const metricScaleMax = block.data?.metric_scale_max
  const sortMode = block.data?.sort_mode ?? 'template_order'

  const sourceItems = filterItems(getSourceItems(getLayerSourceName(layer), context) ?? [], block)
  const scoringConfig = getNormalizedScoringConfig(context)

  let items = sourceItems.map((item) => {
    const definition = getLayerDefinition(questionBank, layer, item.key)
    const narrativeLevel = getNarrativeLevelForItem(scoringConfig, layer, item)
    const currentBehaviour =
      narrativeLevel === 'low'
        ? definition?.behaviourIndicators.low
        : narrativeLevel === 'high'
          ? definition?.behaviourIndicators.high
          : definition?.behaviourIndicators.mid
    const metric = resolveMetricValue(item, metricKey, metricScaleMax)
    const label = labelMode === 'internal'
      ? (definition?.internalName || item.label)
      : (definition?.externalName || item.label)
    const description =
      bodySource === 'summary_definition'
        ? (definition?.summaryDefinition || undefined)
        : bodySource === 'detailed_definition'
          ? (definition?.detailedDefinition || undefined)
          : bodySource === 'current_band_behaviour'
            ? (currentBehaviour || undefined)
            : undefined

    return {
      ...item,
      label,
      value: metric.value,
      description,
      summaryDefinition: definition?.summaryDefinition,
      detailedDefinition: definition?.detailedDefinition,
      behaviourHigh: definition?.behaviourIndicators.high,
      behaviourMid: definition?.behaviourIndicators.mid,
      behaviourLow: definition?.behaviourIndicators.low,
      currentBehaviour: showBehaviourSnapshot ? currentBehaviour : undefined,
      lowMeaning: definition?.scoreInterpretation.low || item.lowMeaning,
      highMeaning: definition?.scoreInterpretation.high || item.highMeaning,
      metricUnavailable: metric.unavailable,
    } satisfies V2BlockResolvedItem
  })

  if (sortMode === 'alphabetical') {
    items = [...items].sort((left, right) => left.label.localeCompare(right.label))
  } else if (sortMode === 'score_desc') {
    items = [...items].sort((left, right) => (right.value ?? Number.NEGATIVE_INFINITY) - (left.value ?? Number.NEGATIVE_INFINITY))
  } else if (sortMode === 'score_asc') {
    items = [...items].sort((left, right) => (left.value ?? Number.POSITIVE_INFINITY) - (right.value ?? Number.POSITIVE_INFINITY))
  }

  if (behaviourMode === 'none') {
    items = items.map((item) => ({ ...item, currentBehaviour: undefined }))
  }

  return {
    source: 'layer_profile',
    items,
  }
}

function resolveInterpretations(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  const useDerivedNarrative = block.data?.content_mode
    ? block.data.content_mode === 'derived_outcome'
    : block.filter?.use_derived_narrative === true

  if (useDerivedNarrative) {
    const resolvedOutcome = resolveOutcomeForBlock(block, context)
    if (resolvedOutcome) {
      const outcomeData = toDerivedOutcomeData(resolvedOutcome.outcome)
      return {
        source: 'interpretations',
        items: filterItems([{
          key: 'derived_narrative',
          label: outcomeData.label,
          description: outcomeData.narrative,
        }], block),
        derivedOutcome: outcomeData,
      }
    }
  }

  return {
    source: 'interpretations',
    items: filterItems(getSourceItems('interpretations', context), block),
  }
}

function resolveRecommendations(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  const useDerivedNarrative = block.data?.content_mode
    ? block.data.content_mode === 'derived_outcome'
    : block.filter?.use_derived_narrative !== false

  const resolvedOutcome = useDerivedNarrative
    ? resolveOutcomeForBlock(block, context)
    : null
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

function resolveReportHeader(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData {
  const meta = context.reportMeta ?? {
    title: 'Assessment report',
    subtitle: '',
    participantName: context.v2Report?.personName ?? '',
    recipientEmail: null,
    completedAt: null,
    orgLogoUrl: null,
    orgName: null,
    brandingCssOverrides: '',
  }
  return {
    source: 'report_header',
    items: [],
    reportHeader: {
      ...meta,
      badgeLabel: block.data?.badge_label ?? block.content?.eyebrow ?? 'Assessment report',
      showDate: block.data?.show_date !== false,
      showParticipant: block.data?.show_participant !== false,
      showEmail: block.data?.show_email !== false,
      title: block.content?.title ?? meta.title,
      subtitle: block.content?.description ?? meta.subtitle,
    },
  }
}

function resolveReportCta(
  block: V2ReportBlockDefinition,
): V2BlockResolvedData {
  return {
    source: 'report_cta',
    items: [],
    markdown: block.content?.body_markdown ?? '',
  }
}

function findArchetypeBandSelection(
  config: V2ScoringConfig,
  archetypeSetId: string,
  context: V2ReportDataContext
): Record<string, string> | null {
  const archetypeSet = getArchetypeSet(config, archetypeSetId)
  if (!archetypeSet) return null

  const sourceName =
    archetypeSet.level === 'dimension'
      ? 'dimension_scores'
      : archetypeSet.level === 'competency'
        ? 'competency_scores'
        : 'trait_scores'
  const items = getSourceItems(sourceName, context)

  const selection: Record<string, string> = {}
  for (const targetKey of archetypeSet.targetKeys) {
    const normalizedTargetKey = normalizeReportKey(targetKey)
    const matchingItem = items.find((item: V2BlockResolvedItem) => normalizeReportKey(item.key) === normalizedTargetKey)
    const bandLabel = matchingItem?.band
    if (typeof bandLabel === 'string') {
      selection[targetKey] = bandLabel
    } else {
      return null
    }
  }

  return selection
}

function resolveArchetypeProfileBlock(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData | null {
  const scoringConfig = getNormalizedScoringConfig(context)
  if (!scoringConfig) return null

  const archetypeSetKey = block.filter?.outcome_set_key ?? scoringConfig.archetypes[0]?.key
  if (!archetypeSetKey) return resolveOverallClassification(block, context)

  const archetypeSet = getArchetypeSet(scoringConfig, archetypeSetKey)
  if (!archetypeSet) return resolveOverallClassification(block, context)

  const bandSelection = findArchetypeBandSelection(scoringConfig, archetypeSetKey, context)
  if (!bandSelection) return resolveOverallClassification(block, context)

  const resolution = resolveArchetype(scoringConfig, archetypeSet, bandSelection)
  if (resolution.status === 'unmatched') return resolveOverallClassification(block, context)

  const profile = resolution.profile

  // Build input items showing strength and constraint signals
  const inputItems: V2BlockResolvedItem[] = []

  if (profile.strengthKeys.length > 0) {
    inputItems.push({
      key: 'strengths',
      label: 'Strengths',
      description: profile.strengthKeys.join(', '),
    })
  }

  if (profile.constraintKeys.length > 0) {
    inputItems.push({
      key: 'constraints',
      label: 'Constraints',
      description: profile.constraintKeys.join(', '),
    })
  }

  return {
    source: 'archetype_profile',
    items: filterItems(inputItems, block),
    classification: {
      key: profile.key,
      label: profile.label,
      description: profile.tagline || profile.shortDescription,
    },
    derivedOutcome: {
      key: profile.key,
      label: profile.label,
      description: profile.shortDescription || profile.tagline,
      summary: profile.reportSummary || profile.shortDescription,
      narrative: profile.fullNarrative || profile.reportSummary || profile.shortDescription,
      recommendations: profile.recommendations,
    },
  }
}

const BLOCK_DATA_RESOLVERS: Record<V2BlockDataSource, V2BlockDataResolver> = {
  overall_classification: (block, context) => resolveOverallClassification(block, context),
  archetype_profile: (block, context) => resolveArchetypeProfileBlock(block, context),
  derived_outcome: (block, context) => resolveDerivedOutcomeBlock(block, context),
  layer_profile: (block, context) => resolveLayerProfile(block, context),
  dimension_scores: (block, context) => resolveScores('dimension_scores', block, context),
  competency_scores: (block, context) => resolveScores('competency_scores', block, context),
  trait_scores: (block, context) => resolveScores('trait_scores', block, context),
  interpretations: (block, context) => resolveInterpretations(block, context),
  recommendations: (block, context) => resolveRecommendations(block, context),
  static_content: (block, context) => resolveStaticContent(block, context),
  report_header: (block, context) => resolveReportHeader(block, context),
  report_cta: (block) => resolveReportCta(block),
}

export function resolveBlockData(
  block: V2ReportBlockDefinition,
  context: V2ReportDataContext
): V2BlockResolvedData | null {
  const resolver = BLOCK_DATA_RESOLVERS[block.source]
  if (!resolver) return null
  return resolver(block, context)
}
