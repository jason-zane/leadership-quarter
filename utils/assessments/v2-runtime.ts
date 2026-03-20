import {
  normalizeReportConfig,
  type ReportConfig,
  type V2CutoverStatus,
} from '@/utils/assessments/experience-config'
import {
  normalizeV2PsychometricsConfig,
  type V2PsychometricsConfig,
} from '@/utils/assessments/v2-psychometrics'
import {
  getBandingConfig,
  getDerivedOutcomeSet,
  getInterpretationContent,
  getRollupWeight,
  normalizeV2ScoringConfig,
  resolveDerivedOutcome,
  type V2BandDefinition,
  type V2DerivedOutcome,
  type V2ScoringConfig,
  type V2ScoringLevel,
} from '@/utils/assessments/v2-scoring'
import {
  normalizeV2QuestionBank,
  type V2QuestionBank,
  type V2ScalePoints,
} from '@/utils/assessments/v2-question-bank'
import type { RuntimeAssessmentQuestion } from '@/utils/services/assessment-runtime-content'
import type { V2AssessmentReportRecord } from '@/utils/reports/v2-assessment-reports'

export type V2RuntimeMode = 'default' | 'v2'

export type V2RuntimeReadinessCheck = {
  key: string
  label: string
  ready: boolean
  detail: string
}

export type V2RuntimeReadiness = {
  checks: V2RuntimeReadinessCheck[]
  readyCount: number
  totalCount: number
  canPreview: boolean
  canCutover: boolean
}

export type V2RuntimeScale = {
  points: V2ScalePoints
  labels: string[]
}

export type V2ScoredEntity = {
  key: string
  label: string
  value: number
  bandKey: string | null
  bandLabel: string | null
  meaning: string
}

export type V2ResolvedInterpretation = {
  key: string
  label: string
  description: string
}

export type V2SubmissionScoringResult = {
  normalizedResponses: Record<string, number>
  scores: Record<string, number>
  bands: Record<string, string>
  bandKeys: Record<string, string>
  classification: {
    key: string
    label: string
    description: string
  } | null
  recommendations: string[]
  derivedOutcome: V2DerivedOutcome | null
  traitScores: V2ScoredEntity[]
  competencyScores: V2ScoredEntity[]
  dimensionScores: V2ScoredEntity[]
  interpretations: V2ResolvedInterpretation[]
}

export type V2SubmissionReportScoreItem = {
  key: string
  label: string
  value: number
  band: string
  raw_value: number
  display_value: number
  display_min: number
  display_max: number
  band_key: string
  sten_value: number | null
  percentile_value: number | null
}

export type V2SubmissionReportData = {
  personName: string
  role: string
  organisation: string
  classification: {
    key: string
    label: string
    description: string
  } | null
  dimension_scores: V2SubmissionReportScoreItem[]
  competency_scores: V2SubmissionReportScoreItem[]
  trait_scores: V2SubmissionReportScoreItem[]
  interpretations: Array<{ key: string; label: string; description: string }>
  recommendations: Array<{ key: string; label: string; description: string }>
  static_content: string
}

export type V2SubmissionRuntimeMetadata = {
  runtimeVersion: 'v2'
  runtimeSchemaVersion: number
  deliveryMode: 'preview' | 'live'
  assessmentVersion: number
  scoredAt: string
}

export type V2SubmissionArtifacts = {
  metadata: V2SubmissionRuntimeMetadata
  scoring: V2SubmissionScoringResult
  reportContext: V2SubmissionReportData
}

function roundScore(value: number) {
  return Number(value.toFixed(2))
}

function scoreInRange(value: number, band: V2BandDefinition) {
  return value >= band.min && value <= band.max
}

function getDisplayName(primary: string, fallback: string) {
  return primary.trim() || fallback.trim()
}

function reverseLikert(value: number, scalePoints: number) {
  return (scalePoints + 1) - value
}

function normalizeResponseValue(
  raw: number,
  scalePoints: number,
  descending: boolean,
  reverseCoded: boolean
) {
  const directionAdjusted = descending ? reverseLikert(raw, scalePoints) : raw
  return reverseCoded ? reverseLikert(directionAdjusted, scalePoints) : directionAdjusted
}

function scoreWithMethod(values: Array<{ value: number; weight: number }>, method: 'average' | 'sum') {
  if (values.length === 0) return 0
  if (method === 'sum') {
    return values.reduce((sum, item) => sum + item.value * item.weight, 0)
  }

  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) return 0
  return values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
}

function rescaleScore(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number
) {
  if (inputMax <= inputMin) return value
  const ratio = (value - inputMin) / (inputMax - inputMin)
  return outputMin + (outputMax - outputMin) * ratio
}

function getBandForValue(bands: V2BandDefinition[], value: number) {
  return bands.find((band) => scoreInRange(value, band)) ?? null
}

function getBandNarrativeLevel(bands: V2BandDefinition[], bandId: string | null): 'low' | 'mid' | 'high' {
  const sorted = [...bands].sort((left, right) => left.min - right.min)
  const index = sorted.findIndex((band) => band.id === bandId)
  if (index <= 0) return 'low'
  if (index >= sorted.length - 1) return 'high'
  return 'mid'
}

function buildEntityScores(input: {
  keys: string[]
  labelFor: (key: string) => string
  level: V2ScoringLevel
  values: Record<string, number>
  scoringConfig: V2ScoringConfig
}) {
  return input.keys.map((key) => {
    const value = roundScore(input.values[key] ?? 0)
    const banding = getBandingConfig(input.scoringConfig, input.level, key)
    const band = getBandForValue(banding.bands, value)

    return {
      key,
      label: input.labelFor(key),
      value,
      bandKey: band?.id ?? null,
      bandLabel: band?.label ?? null,
      meaning: band?.meaning ?? '',
    } satisfies V2ScoredEntity
  })
}

function getInterpretationDescription(
  scoringConfig: V2ScoringConfig,
  level: V2ScoringLevel,
  targetKey: string,
  bandKey: string | null
) {
  const content = getInterpretationContent(scoringConfig, level, targetKey)
  const banding = getBandingConfig(scoringConfig, level, targetKey)
  const narrativeLevel = getBandNarrativeLevel(banding.bands, bandKey)

  if (narrativeLevel === 'low') return content.lowMeaning
  if (narrativeLevel === 'high') return content.highMeaning
  return content.midMeaning
}

export function shouldUseV2Runtime(reportConfig: unknown, input?: { forceV2?: boolean }) {
  const config = normalizeReportConfig(reportConfig)
  if (!config.v2_runtime_enabled) return false
  return Boolean(input?.forceV2) || config.v2_cutover_status === 'cutover_live'
}

export function getV2CutoverLabel(value: V2CutoverStatus) {
  switch (value) {
    case 'internal_validation':
      return 'Internal validation'
    case 'shadow_ready':
      return 'Shadow ready'
    case 'migration_ready':
      return 'Migration ready'
    case 'cutover_live':
      return 'Cutover live'
    default:
      return 'Draft'
  }
}

export function buildV2RuntimeQuestions(questionBank: unknown): RuntimeAssessmentQuestion[] {
  const bank = normalizeV2QuestionBank(questionBank)
  const traitNameByKey = new Map(
    bank.traits.map((trait) => [trait.key, getDisplayName(trait.externalName, trait.internalName || trait.key)])
  )

  const scoredQuestions = bank.scoredItems.map((item, index) => ({
    id: item.id,
    question_key: item.key,
    text: item.text,
    dimension: traitNameByKey.get(item.traitKey) ?? item.traitKey,
    is_reverse_coded: item.isReverseCoded,
    sort_order: index + 1,
  }))

  const socialQuestions = bank.socialItems.map((item, index) => ({
    id: item.id,
    question_key: item.key,
    text: item.text,
    dimension: 'Social desirability',
    is_reverse_coded: item.isReverseCoded,
    sort_order: scoredQuestions.length + index + 1,
  }))

  return [...scoredQuestions, ...socialQuestions]
}

export function getV2RuntimeScale(questionBank: unknown): V2RuntimeScale {
  const bank = normalizeV2QuestionBank(questionBank)
  return {
    points: bank.scale.points,
    labels: bank.scale.labels,
  }
}

export function computeV2Readiness(input: {
  questionBank: unknown
  scoringConfig: unknown
  psychometricsConfig: unknown
  reports: V2AssessmentReportRecord[]
  runnerConfig: unknown
  reportConfig: unknown
  linkedCampaignCount?: number
  submissionCount?: number
}): V2RuntimeReadiness {
  const questionBank = normalizeV2QuestionBank(input.questionBank)
  const scoringConfig = normalizeV2ScoringConfig(input.scoringConfig)
  const psychometricsConfig = normalizeV2PsychometricsConfig(input.psychometricsConfig)
  const runnerConfig = input.runnerConfig && typeof input.runnerConfig === 'object'
    ? input.runnerConfig as Record<string, unknown>
    : {}
  const reportConfig = normalizeReportConfig(input.reportConfig)

  const checks: V2RuntimeReadinessCheck[] = [
    {
      key: 'questions',
      label: 'Questions',
      ready: questionBank.scoredItems.length > 0 && questionBank.traits.length > 0,
      detail:
        questionBank.scoredItems.length > 0
          ? `${questionBank.scoredItems.length} scored items authored`
          : 'Add scored items and trait structure',
    },
    {
      key: 'scoring',
      label: 'Scoring',
      ready: scoringConfig.bandings.length > 0,
      detail:
        scoringConfig.bandings.length > 0
          ? `${scoringConfig.bandings.length} band sets configured`
          : 'Configure scoring bands and interpretations',
    },
    {
      key: 'psychometrics',
      label: 'Psychometrics',
      ready:
        psychometricsConfig.referenceGroups.length > 0
        || psychometricsConfig.validationRuns.length > 0,
      detail:
        psychometricsConfig.referenceGroups.length > 0
          ? `${psychometricsConfig.referenceGroups.length} reference groups configured`
          : psychometricsConfig.validationRuns.length > 0
            ? `${psychometricsConfig.validationRuns.length} validation runs saved`
            : 'Reference groups or validation runs still missing',
    },
    {
      key: 'reports',
      label: 'Reports',
      ready: input.reports.some((report) => report.status === 'published'),
      detail:
        input.reports.some((report) => report.status === 'published')
          ? `${input.reports.filter((report) => report.status === 'published').length} published reports`
          : 'Publish at least one V2 report',
    },
    {
      key: 'experience',
      label: 'Experience',
      ready: typeof runnerConfig.title === 'string' && reportConfig.v2_runtime_enabled,
      detail:
        reportConfig.v2_runtime_enabled
          ? 'Runtime is enabled for preview or cutover'
          : 'Enable V2 runtime in the experience tab',
    },
    {
      key: 'campaigns',
      label: 'Campaigns',
      ready: (input.linkedCampaignCount ?? 0) > 0,
      detail:
        (input.linkedCampaignCount ?? 0) > 0
          ? `${input.linkedCampaignCount} campaigns linked`
          : 'No campaigns linked yet',
    },
    {
      key: 'responses',
      label: 'Responses',
      ready: (input.submissionCount ?? 0) > 0,
      detail:
        (input.submissionCount ?? 0) > 0
          ? `${input.submissionCount} submissions recorded`
          : 'No V2 submissions recorded yet',
    },
  ]

  const readyCount = checks.filter((check) => check.ready).length

  return {
    checks,
    readyCount,
    totalCount: checks.length,
    canPreview: checks.find((check) => check.key === 'questions')?.ready === true,
    canCutover: checks.every((check) => check.ready || check.key === 'responses'),
  }
}

export function scoreV2AssessmentSubmission(input: {
  questionBank: unknown
  scoringConfig: unknown
  responses: Record<string, number>
}): V2SubmissionScoringResult {
  const questionBank = normalizeV2QuestionBank(input.questionBank)
  const scoringConfig = normalizeV2ScoringConfig(input.scoringConfig)
  const normalizedResponses: Record<string, number> = {}

  const descending = questionBank.scale.order === 'descending'
  const traitScoresRaw: Record<string, number> = {}
  const competencyScoresRaw: Record<string, number> = {}
  const dimensionScoresRaw: Record<string, number> = {}

  const traitByKey = new Map(questionBank.traits.map((trait) => [trait.key, trait]))
  const competencyByKey = new Map(questionBank.competencies.map((item) => [item.key, item]))
  const dimensionByKey = new Map(questionBank.dimensions.map((item) => [item.key, item]))

  for (const item of questionBank.scoredItems) {
    const raw = input.responses[item.key]
    if (!Number.isInteger(raw) || raw < 1 || raw > questionBank.scale.points) {
      continue
    }

    normalizedResponses[item.key] = normalizeResponseValue(
      raw,
      questionBank.scale.points,
      descending,
      item.isReverseCoded
    )
  }

  for (const item of questionBank.socialItems) {
    const raw = input.responses[item.key]
    if (!Number.isInteger(raw) || raw < 1 || raw > questionBank.scale.points) {
      continue
    }

    normalizedResponses[item.key] = normalizeResponseValue(
      raw,
      questionBank.scale.points,
      descending,
      item.isReverseCoded
    )
  }

  for (const trait of questionBank.traits) {
    const traitItems = questionBank.scoredItems
      .filter((item) => item.traitKey === trait.key)
      .map((item) => ({
        value: normalizedResponses[item.key],
        weight: scoringConfig.calculation.useItemWeights ? item.weight : 1,
      }))
      .filter((item): item is { value: number; weight: number } => typeof item.value === 'number')

    traitScoresRaw[trait.key] = scoreWithMethod(
      traitItems,
      scoringConfig.calculation.traitOverrides.find((item) => item.targetKey === trait.key)?.method
        ?? scoringConfig.calculation.traitDefaultMethod
    )
  }

  for (const competency of questionBank.competencies) {
    const traitValues = questionBank.traits
      .filter((trait) => trait.competencyKeys.includes(competency.key))
      .map((trait) => ({
        value: traitScoresRaw[trait.key],
        weight: getRollupWeight(scoringConfig.rollups.competency.weights, competency.key, trait.key),
      }))
      .filter((item): item is { value: number; weight: number } => Number.isFinite(item.value))

    competencyScoresRaw[competency.key] = scoreWithMethod(traitValues, scoringConfig.rollups.competency.method)
  }

  for (const dimension of questionBank.dimensions) {
    const competencyValues = questionBank.competencies
      .filter((competency) => competency.dimensionKeys.includes(dimension.key))
      .map((competency) => ({
        value: competencyScoresRaw[competency.key],
        weight: getRollupWeight(scoringConfig.rollups.dimension.weights, dimension.key, competency.key),
      }))
      .filter((item): item is { value: number; weight: number } => Number.isFinite(item.value))

    dimensionScoresRaw[dimension.key] = scoreWithMethod(competencyValues, scoringConfig.rollups.dimension.method)
  }

  const inputMin = 1
  const inputMax = questionBank.scale.points
  const outputMin = scoringConfig.transforms.displayRangeMin
  const outputMax = scoringConfig.transforms.displayRangeMax
  const displayValueFor = (value: number) => {
    const transformed = scoringConfig.transforms.displayMode === 'rescaled'
      ? rescaleScore(value, inputMin, inputMax, outputMin, outputMax)
      : value
    return roundScore(transformed)
  }

  const traitDisplayValues = Object.fromEntries(
    Object.entries(traitScoresRaw).map(([key, value]) => [key, displayValueFor(value)])
  )
  const competencyDisplayValues = Object.fromEntries(
    Object.entries(competencyScoresRaw).map(([key, value]) => [key, displayValueFor(value)])
  )
  const dimensionDisplayValues = Object.fromEntries(
    Object.entries(dimensionScoresRaw).map(([key, value]) => [key, displayValueFor(value)])
  )

  const traitScores = buildEntityScores({
    keys: questionBank.traits.map((trait) => trait.key),
    labelFor: (key) => getDisplayName(traitByKey.get(key)?.externalName ?? '', traitByKey.get(key)?.internalName ?? key),
    level: 'trait',
    values: traitDisplayValues,
    scoringConfig,
  })
  const competencyScores = buildEntityScores({
    keys: questionBank.competencies.map((item) => item.key),
    labelFor: (key) => getDisplayName(competencyByKey.get(key)?.externalName ?? '', competencyByKey.get(key)?.internalName ?? key),
    level: 'competency',
    values: competencyDisplayValues,
    scoringConfig,
  })
  const dimensionScores = buildEntityScores({
    keys: questionBank.dimensions.map((item) => item.key),
    labelFor: (key) => getDisplayName(dimensionByKey.get(key)?.externalName ?? '', dimensionByKey.get(key)?.internalName ?? key),
    level: 'dimension',
    values: dimensionDisplayValues,
    scoringConfig,
  })

  const scores = {
    ...Object.fromEntries(traitScores.map((item) => [item.key, item.value])),
    ...Object.fromEntries(competencyScores.map((item) => [item.key, item.value])),
    ...Object.fromEntries(dimensionScores.map((item) => [item.key, item.value])),
  }
  const bands = {
    ...Object.fromEntries(traitScores.map((item) => [item.key, item.bandLabel ?? ''])),
    ...Object.fromEntries(competencyScores.map((item) => [item.key, item.bandLabel ?? ''])),
    ...Object.fromEntries(dimensionScores.map((item) => [item.key, item.bandLabel ?? ''])),
  }
  const bandKeys = {
    ...Object.fromEntries(traitScores.map((item) => [item.key, item.bandKey ?? ''])),
    ...Object.fromEntries(competencyScores.map((item) => [item.key, item.bandKey ?? ''])),
    ...Object.fromEntries(dimensionScores.map((item) => [item.key, item.bandKey ?? ''])),
  }

  const derivedOutcomeSet = scoringConfig.derivedOutcomes[0] ?? null
  const derivedOutcome = derivedOutcomeSet
    ? (() => {
        const selectionSource = derivedOutcomeSet.level === 'dimension'
          ? dimensionScores
          : derivedOutcomeSet.level === 'competency'
            ? competencyScores
            : traitScores
        const bandSelection = Object.fromEntries(
          selectionSource
            .filter((item) => derivedOutcomeSet.targetKeys.includes(item.key) && item.bandKey)
            .map((item) => [item.key, item.bandKey!])
        )
        if (Object.keys(bandSelection).length !== derivedOutcomeSet.targetKeys.length) return null

        const resolved = resolveDerivedOutcome(
          scoringConfig,
          getDerivedOutcomeSet(scoringConfig, derivedOutcomeSet.key) ?? derivedOutcomeSet,
          bandSelection
        )
        return resolved.status === 'matched' ? resolved.outcome : null
      })()
    : null

  const interpretations: V2ResolvedInterpretation[] = [
    ...dimensionScores.map((item) => ({
      key: `dimension_${item.key}`,
      label: item.label,
      description: getInterpretationDescription(scoringConfig, 'dimension', item.key, item.bandKey),
    })),
    ...competencyScores.map((item) => ({
      key: `competency_${item.key}`,
      label: item.label,
      description: getInterpretationDescription(scoringConfig, 'competency', item.key, item.bandKey),
    })),
    ...traitScores.map((item) => ({
      key: `trait_${item.key}`,
      label: item.label,
      description: getInterpretationDescription(scoringConfig, 'trait', item.key, item.bandKey),
    })),
  ].filter((item) => item.description.trim().length > 0)

  const fallbackRecommendations = [
    ...new Set(
      [...dimensionScores, ...competencyScores, ...traitScores]
        .map((item) => {
          const level = item.key in dimensionScoresRaw
            ? 'dimension'
            : item.key in competencyScoresRaw
              ? 'competency'
              : 'trait'
          return getInterpretationContent(scoringConfig, level as V2ScoringLevel, item.key).developmentFocus.trim()
        })
        .filter(Boolean)
    ),
  ]

  const classification = derivedOutcome
    ? {
        key: derivedOutcome.key,
        label: derivedOutcome.label,
        description: derivedOutcome.fullNarrative || derivedOutcome.reportSummary || derivedOutcome.shortDescription,
      }
    : dimensionScores[0]
      ? {
          key: dimensionScores[0].key,
          label: dimensionScores[0].label,
          description: dimensionScores[0].meaning,
        }
      : null

  return {
    normalizedResponses,
    scores,
    bands,
    bandKeys,
    classification,
    recommendations: derivedOutcome?.recommendations.length
      ? derivedOutcome.recommendations
      : fallbackRecommendations,
    derivedOutcome,
    traitScores,
    competencyScores,
    dimensionScores,
    interpretations,
  }
}

export function buildV2SubmissionReportData(input: {
  result: V2SubmissionScoringResult
  participant?: {
    firstName?: string | null
    lastName?: string | null
    role?: string | null
    organisation?: string | null
  } | null
}): V2SubmissionReportData {
  const personName = [
    input.participant?.firstName?.trim(),
    input.participant?.lastName?.trim(),
  ]
    .filter(Boolean)
    .join(' ')
  const role = input.participant?.role?.trim() ?? ''
  const organisation = input.participant?.organisation?.trim() ?? ''

  return {
    personName,
    role,
    organisation,
    classification: input.result.classification,
    dimension_scores: input.result.dimensionScores.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      band: item.bandLabel ?? '',
      raw_value: item.value,
      display_value: item.value,
      display_min: 0,
      display_max: 100,
      band_key: item.bandKey ?? '',
      sten_value: null,
      percentile_value: null,
    })),
    competency_scores: input.result.competencyScores.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      band: item.bandLabel ?? '',
      raw_value: item.value,
      display_value: item.value,
      display_min: 0,
      display_max: 100,
      band_key: item.bandKey ?? '',
      sten_value: null,
      percentile_value: null,
    })),
    trait_scores: input.result.traitScores.map((item) => ({
      key: item.key,
      label: item.label,
      value: item.value,
      band: item.bandLabel ?? '',
      raw_value: item.value,
      display_value: item.value,
      display_min: 0,
      display_max: 100,
      band_key: item.bandKey ?? '',
      sten_value: null,
      percentile_value: null,
    })),
    interpretations: input.result.interpretations.map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description,
    })),
    recommendations: input.result.recommendations.map((item, index) => ({
      key: `recommendation_${index + 1}`,
      label: `Recommendation ${index + 1}`,
      description: item,
    })),
    static_content: 'This report was generated by the V2 assessment engine.',
  }
}

export function buildV2SubmissionArtifacts(input: {
  questionBank: unknown
  scoringConfig: unknown
  responses: Record<string, number>
  participant?: {
    firstName?: string | null
    lastName?: string | null
    role?: string | null
    organisation?: string | null
  } | null
  metadata: {
    assessmentVersion: number
    deliveryMode: 'preview' | 'live'
    runtimeSchemaVersion?: number
    scoredAt?: string
  }
}): V2SubmissionArtifacts {
  const scoring = scoreV2AssessmentSubmission({
    questionBank: input.questionBank,
    scoringConfig: input.scoringConfig,
    responses: input.responses,
  })

  return {
    metadata: {
      runtimeVersion: 'v2',
      runtimeSchemaVersion: input.metadata.runtimeSchemaVersion ?? 1,
      deliveryMode: input.metadata.deliveryMode,
      assessmentVersion: input.metadata.assessmentVersion,
      scoredAt: input.metadata.scoredAt ?? new Date().toISOString(),
    },
    scoring,
    reportContext: buildV2SubmissionReportData({
      result: scoring,
      participant: input.participant,
    }),
  }
}
