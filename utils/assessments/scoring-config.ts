import type {
  ScoringBand,
  ScoringClassification,
  ScoringClassificationExclusion,
  ScoringClassificationSignal,
  ScoringCondition,
  ScoringConfig,
  ScoringCoverageIssue,
  ScoringCoverageReport,
  ScoringDimension,
  ScoringMatrixCell,
  ScaleConfig,
} from '@/utils/assessments/types'

type ActiveQuestion = {
  dimension: string
  is_active?: boolean
}

const SCALE_POINTS = new Set([2, 3, 4, 5, 6, 7])
export const MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS = 500
export const MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS = 250

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  points: 5,
  labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
}

export function createEmptyScoringConfig(): ScoringConfig {
  return {
    version: 2,
    scale_config: { ...DEFAULT_SCALE_CONFIG, labels: [...DEFAULT_SCALE_CONFIG.labels] },
    dimensions: [],
    classifications: [],
    classification_overrides: [],
    classification_matrix: [],
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toKey(value: string, fallback: string) {
  const key = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return key || fallback
}

function toNumber(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function normalizeScaleConfig(value: unknown): ScaleConfig {
  if (!isObject(value)) return { ...DEFAULT_SCALE_CONFIG, labels: [...DEFAULT_SCALE_CONFIG.labels] }

  const points = SCALE_POINTS.has(Number(value.points)) ? (Number(value.points) as ScaleConfig['points']) : DEFAULT_SCALE_CONFIG.points
  const rawLabels = Array.isArray(value.labels) ? value.labels : []
  const labels = Array.from({ length: points }, (_, index) => {
    const next = rawLabels[index]
    return typeof next === 'string' && next.trim() ? next : DEFAULT_SCALE_CONFIG.labels[index] ?? `Option ${index + 1}`
  })

  return { points, labels }
}

function normalizeClassification(value: unknown, index: number): ScoringClassification | null {
  if (!isObject(value)) return null
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  if (!label) return null
  const key = typeof value.key === 'string' && value.key.trim() ? value.key.trim() : toKey(label, `classification_${index + 1}`)
  const conditions = Array.isArray(value.conditions)
    ? value.conditions
        .map((condition) => {
          if (!isObject(condition)) return null
          const dimension = typeof condition.dimension === 'string' ? condition.dimension.trim() : ''
          const operator = typeof condition.operator === 'string' ? condition.operator : '>='
          const score = toNumber(condition.value, Number.NaN)
          if (!dimension || !Number.isFinite(score)) return null
          return { dimension, operator: operator as ScoringCondition['operator'], value: score }
        })
        .filter((condition): condition is ScoringCondition => condition !== null)
    : []
  const recommendations = Array.isArray(value.recommendations)
    ? value.recommendations.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []
  const preferredSignals = Array.isArray(value.preferred_signals)
    ? value.preferred_signals
        .map((signal) => {
          if (!isObject(signal)) return null
          const dimension = typeof signal.dimension === 'string' ? signal.dimension.trim() : ''
          const bandKey = typeof signal.band_key === 'string' ? signal.band_key.trim() : ''
          if (!dimension || !bandKey) return null
          return {
            dimension,
            band_key: bandKey,
            weight: Math.max(0.1, toNumber(signal.weight, 1)),
          } satisfies ScoringClassificationSignal
        })
        .filter((signal): signal is ScoringClassificationSignal => signal !== null)
    : []
  const excludedSignals = Array.isArray(value.excluded_signals)
    ? value.excluded_signals
        .map((signal) => {
          if (!isObject(signal)) return null
          const dimension = typeof signal.dimension === 'string' ? signal.dimension.trim() : ''
          const bandKey = typeof signal.band_key === 'string' ? signal.band_key.trim() : ''
          if (!dimension || !bandKey) return null
          return {
            dimension,
            band_key: bandKey,
          } satisfies ScoringClassificationExclusion
        })
        .filter((signal): signal is ScoringClassificationExclusion => signal !== null)
    : []

  return {
    key,
    label,
    conditions,
    recommendations,
    description: typeof value.description === 'string' && value.description.trim() ? value.description.trim() : undefined,
    automation_rationale:
      typeof value.automation_rationale === 'string' && value.automation_rationale.trim()
        ? value.automation_rationale.trim()
        : undefined,
    preferred_signals: preferredSignals,
    excluded_signals: excludedSignals,
  }
}

function normalizeLegacyBands(rawBands: ScoringBand[], scaleMax: number): ScoringBand[] {
  const sorted = [...rawBands].sort((a, b) => a.min_score - b.min_score)
  return sorted.map((band, index) => {
    const next = sorted[index + 1]
    const max = next ? roundToSingleDecimal(next.min_score - 0.1) : scaleMax
    return {
      key: band.key ?? toKey(band.label, `band_${index + 1}`),
      label: band.label,
      min_score: roundToSingleDecimal(band.min_score),
      max_score: roundToSingleDecimal(Math.max(band.min_score, max)),
      meaning: band.meaning,
    }
  })
}

function normalizeBands(value: unknown, scaleMax: number): ScoringBand[] {
  if (!Array.isArray(value)) return []
  const bands = value
    .map((band, index) => {
      if (!isObject(band)) return null
      const label = typeof band.label === 'string' ? band.label.trim() : ''
      if (!label) return null
      const minScore = roundToSingleDecimal(toNumber(band.min_score, 1))
      const maxScoreRaw = band.max_score === undefined ? undefined : roundToSingleDecimal(toNumber(band.max_score, minScore))
      return {
        key: typeof band.key === 'string' && band.key.trim() ? band.key.trim() : toKey(label, `band_${index + 1}`),
        label,
        min_score: minScore,
        max_score: maxScoreRaw,
        meaning: typeof band.meaning === 'string' && band.meaning.trim() ? band.meaning.trim() : undefined,
      } satisfies ScoringBand
    })
    .filter((band): band is NonNullable<typeof band> => band !== null)

  if (bands.some((band) => typeof band.max_score === 'number')) {
    return bands.map((band) => ({
      ...band,
      max_score: typeof band.max_score === 'number' ? band.max_score : scaleMax,
    }))
  }

  return normalizeLegacyBands(bands, scaleMax)
}

function normalizeDimension(value: unknown, index: number, scaleMax: number): ScoringDimension | null {
  if (!isObject(value)) return null
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  const rawKey = typeof value.key === 'string' ? value.key.trim() : ''
  const key = rawKey || toKey(label, `dimension_${index + 1}`)
  if (!key) return null
  const questionKeys = Array.isArray(value.question_keys)
    ? value.question_keys.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []

  return {
    key,
    label: label || key,
    description: typeof value.description === 'string' && value.description.trim() ? value.description.trim() : undefined,
    question_keys: questionKeys,
    bands: normalizeBands(value.bands, scaleMax),
  }
}

function normalizeMatrix(
  value: unknown,
  options: { allowWildcards?: boolean; defaultSource?: 'manual' | 'generated' } = {}
): ScoringMatrixCell[] {
  if (!Array.isArray(value)) return []
  return value
    .map((cell): ScoringMatrixCell | null => {
      if (!isObject(cell) || !isObject(cell.combination)) return null
      const combination = Object.fromEntries(
        Object.entries(cell.combination)
          .map(([dimensionKey, bandKey]) => [String(dimensionKey).trim(), String(bandKey ?? '').trim()])
          .filter(
            ([dimensionKey, bandKey]) =>
              dimensionKey && bandKey && (options.allowWildcards !== false || bandKey !== '*')
          )
      )
      const classificationKey = typeof cell.classification_key === 'string' ? cell.classification_key.trim() : ''
      if (!classificationKey) return null
      return {
        combination,
        classification_key: classificationKey,
        source:
          cell.source === 'generated'
            ? 'generated'
            : cell.source === 'manual'
              ? 'manual'
              : options.defaultSource ?? 'manual',
        rationale: Array.isArray(cell.rationale)
          ? cell.rationale.map((item) => String(item ?? '').trim()).filter(Boolean)
          : undefined,
      }
    })
    .filter((cell): cell is ScoringMatrixCell => cell !== null)
}

export function normalizeScoringConfig(value: unknown): ScoringConfig {
  if (!isObject(value)) return createEmptyScoringConfig()

  const scale = normalizeScaleConfig(value.scale_config)
  const dimensions = Array.isArray(value.dimensions)
    ? value.dimensions
        .map((dimension, index) => normalizeDimension(dimension, index, scale.points))
        .filter((dimension): dimension is ScoringDimension => dimension !== null)
    : []
  const classifications = Array.isArray(value.classifications)
    ? value.classifications
        .map((classification, index) => normalizeClassification(classification, index))
        .filter((classification): classification is ScoringClassification => classification !== null)
    : []
  const version =
    value.version === 2 || Array.isArray(value.classification_matrix) || Array.isArray(value.classification_overrides)
      ? 2
      : 1
  const normalizedMatrix = version === 2 ? normalizeMatrix(value.classification_matrix, { allowWildcards: true }) : []
  const normalizedOverrides = version === 2
    ? normalizeMatrix(value.classification_overrides, { allowWildcards: false, defaultSource: 'manual' })
    : []
  const derivedLegacyOverrides = normalizedOverrides.length > 0
    ? normalizedOverrides
    : normalizedMatrix
        .filter((cell) => cell.source !== 'generated' && !Object.values(cell.combination).includes('*'))
        .map((cell) => ({
          ...cell,
          source: 'manual' as const,
        }))

  return {
    version,
    scale_config: scale,
    dimensions,
    classifications,
    classification_overrides: version === 2 ? derivedLegacyOverrides : [],
    classification_matrix:
      version === 2
        ? normalizedMatrix.filter((cell) => cell.source === 'generated')
        : [],
  }
}

export function isScoringConfigV2(config: ScoringConfig) {
  return normalizeScoringConfig(config).version === 2
}

export function getDimensionBands(config: ScoringConfig, dimension: ScoringDimension): ScoringBand[] {
  const normalized = normalizeScoringConfig(config)
  const scaleMax = normalized.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points
  return normalizeBands(dimension.bands, scaleMax).sort((a, b) => a.min_score - b.min_score)
}

export function getBandByScore(config: ScoringConfig, dimension: ScoringDimension, score: number): ScoringBand | null {
  const bands = getDimensionBands(config, dimension)
  if (bands.length === 0) return null
  const normalizedScore = roundToSingleDecimal(score)
  return bands.find((band) => normalizedScore >= band.min_score && normalizedScore <= (band.max_score ?? normalizedScore)) ?? null
}

function getDimensionKeys(config: ScoringConfig, dimensionKeys?: string[]) {
  const normalized = normalizeScoringConfig(config)
  if (!dimensionKeys?.length) return normalized.dimensions.map((dimension) => dimension.key)
  return normalized.dimensions.filter((dimension) => dimensionKeys.includes(dimension.key)).map((dimension) => dimension.key)
}

function getBandOptionsForDimension(
  config: ScoringConfig,
  dimensionKey: string,
  filters: Record<string, string> = {}
) {
  const normalized = normalizeScoringConfig(config)
  const dimension = normalized.dimensions.find((item) => item.key === dimensionKey)
  if (!dimension) return []
  const filteredBandKey = filters[dimensionKey]
  if (filteredBandKey) return [filteredBandKey]
  return getDimensionBands(normalized, dimension).map((band) => band.key ?? '').filter(Boolean)
}

export function getClassificationCombinationCount(
  config: ScoringConfig,
  options: { dimensionKeys?: string[]; filters?: Record<string, string> } = {}
) {
  const normalized = normalizeScoringConfig(config)
  const dimensionKeys = getDimensionKeys(normalized, options.dimensionKeys)
  if (dimensionKeys.length === 0) return 0

  return dimensionKeys.reduce((total, dimensionKey) => {
    const optionsForDimension = getBandOptionsForDimension(normalized, dimensionKey, options.filters)
    return total * Math.max(1, optionsForDimension.length)
  }, 1)
}

export function getDecisionDimensionKeys(config: ScoringConfig) {
  const normalized = normalizeScoringConfig(config)
  const keys = new Set<string>()

  normalized.classifications.forEach((classification) => {
    classification.conditions.forEach((condition) => keys.add(condition.dimension))
    classification.preferred_signals?.forEach((signal) => keys.add(signal.dimension))
    classification.excluded_signals?.forEach((signal) => keys.add(signal.dimension))
  })

  return normalized.dimensions
    .map((dimension) => dimension.key)
    .filter((dimensionKey) => keys.has(dimensionKey))
}

export function buildCombinationPage(
  config: ScoringConfig,
  options: {
    dimensionKeys?: string[]
    filters?: Record<string, string>
    offset?: number
    limit?: number
    wildcardOtherDimensions?: boolean
  } = {}
) {
  const normalized = normalizeScoringConfig(config)
  const dimensionKeys = getDimensionKeys(normalized, options.dimensionKeys)
  const dimensions = normalized.dimensions.filter((dimension) => dimensionKeys.includes(dimension.key))
  const optionSets = dimensions.map((dimension) => ({
    key: dimension.key,
    options: getBandOptionsForDimension(normalized, dimension.key, options.filters),
  }))
  const total = optionSets.reduce((count, set) => count * Math.max(1, set.options.length), 1)
  const offset = Math.max(0, options.offset ?? 0)
  const limit = Math.max(1, options.limit ?? total)
  const rows: Array<Record<string, string>> = []

  if (optionSets.length === 0 || total === 0 || offset >= total) {
    return { total, rows }
  }

  for (let index = offset; index < Math.min(total, offset + limit); index += 1) {
    let remainder = index
    const digits = new Array(optionSets.length).fill(0)

    for (let digitIndex = optionSets.length - 1; digitIndex >= 0; digitIndex -= 1) {
      const radix = Math.max(1, optionSets[digitIndex].options.length)
      digits[digitIndex] = remainder % radix
      remainder = Math.floor(remainder / radix)
    }

    const combination = Object.fromEntries(
      normalized.dimensions.map((dimension) => [
        dimension.key,
        options.wildcardOtherDimensions ? '*' : getBandOptionsForDimension(normalized, dimension.key, options.filters)[0] ?? '',
      ])
    ) as Record<string, string>

    optionSets.forEach((set, optionIndex) => {
      combination[set.key] = set.options[digits[optionIndex]] ?? ''
    })

    rows.push(combination)
  }

  return { total, rows }
}

function combinationsMatch(
  dimensions: ScoringDimension[],
  candidate: Record<string, string>,
  combination: Record<string, string>
) {
  return dimensions.every((dimension) => {
    const candidateBandKey = candidate[dimension.key]
    if (!candidateBandKey || candidateBandKey === '*') return true
    return candidateBandKey === combination[dimension.key]
  })
}

function findBestMatchingGeneratedCell(config: ScoringConfig, combination: Record<string, string>) {
  const normalized = normalizeScoringConfig(config)
  return (normalized.classification_matrix ?? [])
    .filter((cell) => combinationsMatch(normalized.dimensions, cell.combination, combination))
    .sort((left, right) => {
      const leftWildcards = Object.values(left.combination).filter((value) => value === '*').length
      const rightWildcards = Object.values(right.combination).filter((value) => value === '*').length
      return leftWildcards - rightWildcards
    })[0] ?? null
}

function getClassificationLogicSummary(classification: ScoringClassification) {
  const hasConditions = classification.conditions.length > 0
  const preferredSignals = classification.preferred_signals ?? []
  const excludedSignals = classification.excluded_signals ?? []
  const hasSignalLogic = preferredSignals.length > 0 || excludedSignals.length > 0
  const isPassiveDefault = !hasConditions && !hasSignalLogic
  return { hasConditions, preferredSignals, excludedSignals, isPassiveDefault }
}

export type ClassificationResolution =
  | { status: 'matched'; classification: ScoringClassification; classification_key: string; source: 'override' | 'rules' | 'matrix'; rationale: string[] }
  | { status: 'ambiguous'; rationale: string[] }
  | { status: 'no_match'; rationale: string[] }

export type MatrixPreviewRow = {
  id: string
  combination: Record<string, string>
  classification_key: string | null
  source: 'manual' | 'generated' | 'unmapped'
  rationale: string[]
  editable: boolean
  grouped: boolean
}

export function makeCombinationSignature(dimensions: ScoringDimension[], combination: Record<string, string>) {
  return dimensions.map((dimension) => `${dimension.key}:${combination[dimension.key] ?? ''}`).join('|')
}

export function findClassificationMatrixCell(
  config: ScoringConfig,
  combination: Record<string, string>
): ScoringMatrixCell | null {
  const normalized = normalizeScoringConfig(config)
  const signature = makeCombinationSignature(normalized.dimensions, combination)
  return (
    normalized.classification_matrix?.find(
      (cell) => makeCombinationSignature(normalized.dimensions, cell.combination) === signature
    ) ?? null
  )
}

export function findClassificationOverride(
  config: ScoringConfig,
  combination: Record<string, string>
): ScoringMatrixCell | null {
  const normalized = normalizeScoringConfig(config)
  const signature = makeCombinationSignature(normalized.dimensions, combination)
  return (
    normalized.classification_overrides?.find(
      (cell) => makeCombinationSignature(normalized.dimensions, cell.combination) === signature
    ) ?? null
  )
}

export function resolveClassificationCombination(
  config: ScoringConfig,
  combination: Record<string, string>,
  scores?: Record<string, number>
): ClassificationResolution {
  const normalized = normalizeScoringConfig(config)
  const exactOverride = findClassificationOverride(normalized, combination)
  if (exactOverride) {
    const classification = normalized.classifications.find((item) => item.key === exactOverride.classification_key)
    if (classification) {
      return {
        status: 'matched',
        classification,
        classification_key: classification.key,
        source: 'override',
        rationale: ['Matched an exact manual override.'],
      }
    }
  }

  const conditionCandidates: Array<{ classification: ScoringClassification; rationale: string[] }> = []
  const signalCandidates: Array<{ classification: ScoringClassification; score: number; rationale: string[] }> = []
  const defaultCandidates: ScoringClassification[] = []

  for (const classification of normalized.classifications) {
    const summary = getClassificationLogicSummary(classification)
    const rationale: string[] = []
    let blocked = false

    for (const exclusion of summary.excludedSignals) {
      if (combination[exclusion.dimension] !== exclusion.band_key) continue
      blocked = true
      break
    }
    if (blocked) continue

    if (summary.hasConditions && scores) {
      const matchedAll = classification.conditions.every((condition) =>
        evaluateLegacyCondition(Number(scores[condition.dimension] ?? 0), condition)
      )
      if (matchedAll) {
        conditionCandidates.push({
          classification,
          rationale: ['Matched the legacy score conditions.'],
        })
      }
      continue
    }

    let signalScore = 0
    for (const signal of summary.preferredSignals) {
      if (combination[signal.dimension] !== signal.band_key) continue
      signalScore += signal.weight
      rationale.push(
        `Matched ${signal.dimension} = ${getBandLabel(normalized, signal.dimension, signal.band_key)} (+${signal.weight}).`
      )
    }

    if (signalScore > 0) {
      if (classification.automation_rationale) rationale.push(classification.automation_rationale)
      signalCandidates.push({
        classification,
        score: signalScore,
        rationale,
      })
      continue
    }

    if (summary.isPassiveDefault) defaultCandidates.push(classification)
  }

  if (conditionCandidates.length === 1) {
    const match = conditionCandidates[0]
    return {
      status: 'matched',
      classification: match.classification,
      classification_key: match.classification.key,
      source: 'rules',
      rationale: match.rationale,
    }
  }
  if (conditionCandidates.length > 1) {
    return {
      status: 'ambiguous',
      rationale: ['Multiple classifications matched the legacy score conditions.'],
    }
  }

  const sortedSignalCandidates = signalCandidates.sort((left, right) => right.score - left.score)
  if (
    sortedSignalCandidates.length > 1 &&
    sortedSignalCandidates[0].score === sortedSignalCandidates[1].score
  ) {
    return {
      status: 'ambiguous',
      rationale: ['Multiple classifications matched the same weighted score.'],
    }
  }
  if (sortedSignalCandidates.length > 0) {
    const winner = sortedSignalCandidates[0]
    return {
      status: 'matched',
      classification: winner.classification,
      classification_key: winner.classification.key,
      source: 'rules',
      rationale: [`Matched ${winner.classification.label} via classification signals.`, ...winner.rationale],
    }
  }

  if (defaultCandidates.length === 1) {
    const classification = defaultCandidates[0]
    return {
      status: 'matched',
      classification,
      classification_key: classification.key,
      source: 'rules',
      rationale: ['Used the default fallback classification.'],
    }
  }
  if (defaultCandidates.length > 1) {
    return {
      status: 'ambiguous',
      rationale: ['Multiple classifications are configured as defaults.'],
    }
  }

  const generatedMatch = findBestMatchingGeneratedCell(normalized, combination)
  if (generatedMatch) {
    const classification = normalized.classifications.find((item) => item.key === generatedMatch.classification_key)
    if (classification) {
      return {
        status: 'matched',
        classification,
        classification_key: classification.key,
        source: 'matrix',
        rationale: generatedMatch.rationale ?? ['Matched the generated matrix preview.'],
      }
    }
  }

  return {
    status: 'no_match',
    rationale: ['No classification rules matched this competency profile.'],
  }
}

export function buildMatrixPreviewRows(
  config: ScoringConfig,
  options: { filters?: Record<string, string>; offset?: number; limit?: number } = {}
) {
  const normalized = normalizeScoringConfig(config)
  const exactCombinationCount = getClassificationCombinationCount(normalized, { filters: options.filters })
  const grouped = exactCombinationCount > MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS
  const dimensionKeys = grouped
    ? Array.from(
        new Set([
          ...getDecisionDimensionKeys(normalized),
          ...Object.entries(options.filters ?? {})
            .filter(([, bandKey]) => !!bandKey)
            .map(([dimensionKey]) => dimensionKey),
        ])
      )
    : normalized.dimensions.map((dimension) => dimension.key)
  const page = buildCombinationPage(normalized, {
    dimensionKeys,
    filters: options.filters,
    offset: options.offset,
    limit: options.limit,
    wildcardOtherDimensions: grouped,
  })

  return {
    grouped,
    total_rows: page.total,
    total_exact_combinations: exactCombinationCount,
    rows: page.rows.map((combination) => {
      const resolution = resolveClassificationCombination(normalized, combination)
      return {
        id: makeCombinationSignature(normalized.dimensions, combination),
        combination,
        classification_key: resolution.status === 'matched' ? resolution.classification_key : null,
        source:
          resolution.status === 'matched'
            ? resolution.source === 'override'
              ? 'manual'
              : 'generated'
            : 'unmapped',
        rationale: resolution.rationale,
        editable: !grouped,
        grouped,
      } satisfies MatrixPreviewRow
    }),
  }
}

function evaluateLegacyCondition(score: number, condition: ScoringCondition) {
  if (condition.operator === '>') return score > condition.value
  if (condition.operator === '>=') return score >= condition.value
  if (condition.operator === '<') return score < condition.value
  if (condition.operator === '<=') return score <= condition.value
  if (condition.operator === '=') return score === condition.value
  if (condition.operator === '!=') return score !== condition.value
  return false
}

function classifyLegacyScores(scores: Record<string, number>, classifications: ScoringClassification[]) {
  for (const classification of classifications) {
    if (classification.conditions.length === 0) return classification
    const matches = classification.conditions.every((condition) =>
      evaluateLegacyCondition(Number(scores[condition.dimension] ?? 0), condition)
    )
    if (matches) return classification
  }
  return null
}

function cartesian<T>(items: T[][]): T[][] {
  if (items.length === 0) return [[]]
  return items.reduce<T[][]>(
    (acc, current) => acc.flatMap((prefix) => current.map((item) => [...prefix, item])),
    [[]]
  )
}

export function buildClassificationCombinations(config: ScoringConfig): Array<Record<string, string>> {
  const normalized = normalizeScoringConfig(config)
  const dimensionBands = normalized.dimensions.map((dimension) =>
    getDimensionBands(normalized, dimension).map((band) => ({ dimensionKey: dimension.key, bandKey: band.key! }))
  )

  return cartesian(dimensionBands).map((items) =>
    Object.fromEntries(items.map((item) => [item.dimensionKey, item.bandKey]))
  )
}

export function analyzeScoringCoverage(config: ScoringConfig): ScoringCoverageReport {
  const normalized = normalizeScoringConfig(config)
  if (normalized.version !== 2) {
    return {
      ok: true,
      combinations_total: 0,
      combinations_mapped: 0,
      manual_combinations: 0,
      generated_combinations: 0,
      unresolved_combinations: 0,
      missing_combinations: 0,
      duplicate_combinations: 0,
      analysis_mode: 'exhaustive',
      evaluated_profiles: 0,
      issues: [],
    }
  }

  const issues: ScoringCoverageIssue[] = []
  const classificationKeys = new Set(normalized.classifications.map((classification) => classification.key))
  const referencedClassificationKeys = new Set<string>()
  const bandKeysByDimension = new Map<string, Set<string>>()
  const totalCombinations = getClassificationCombinationCount(normalized)
  const overrideMap = new Map<string, number>()

  for (const dimension of normalized.dimensions) {
    const bands = getDimensionBands(normalized, dimension)
    const keys = new Set<string>()
    let previousMax = 0

    for (const band of bands) {
      if (!band.key) continue
      if (keys.has(band.key)) {
        issues.push({
          type: 'dimension_band_key_duplicate',
          message: `Dimension "${dimension.label}" has duplicate band key "${band.key}".`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
      }
      keys.add(band.key)

      const min = roundToSingleDecimal(band.min_score)
      const max = roundToSingleDecimal(band.max_score ?? min)
      if (min > max) {
        issues.push({
          type: 'dimension_band_invalid',
          message: `Band "${band.label}" in "${dimension.label}" has an invalid score range.`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
        continue
      }
      if (bands.indexOf(band) === 0 && min > 1) {
        issues.push({
          type: 'dimension_band_gap',
          message: `Dimension "${dimension.label}" does not cover scores below ${min}.`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
      }
      if (min > roundToSingleDecimal(previousMax + 0.1) && previousMax > 0) {
        issues.push({
          type: 'dimension_band_gap',
          message: `Dimension "${dimension.label}" has a score gap between ${previousMax} and ${min}.`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
      }
      if (min <= previousMax && previousMax > 0) {
        issues.push({
          type: 'dimension_band_overlap',
          message: `Dimension "${dimension.label}" has overlapping score ranges around "${band.label}".`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
      }
      previousMax = Math.max(previousMax, max)
    }

    if (bands.length > 0 && previousMax < (normalized.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points)) {
      issues.push({
        type: 'dimension_band_gap',
        message: `Dimension "${dimension.label}" does not cover scores up to ${normalized.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points}.`,
        dimension_key: dimension.key,
      })
    }

    bandKeysByDimension.set(dimension.key, keys)
  }

  for (const cell of normalized.classification_overrides ?? []) {
    const signature = makeCombinationSignature(normalized.dimensions, cell.combination)
    overrideMap.set(signature, (overrideMap.get(signature) ?? 0) + 1)
    for (const dimension of normalized.dimensions) {
      const bandKey = cell.combination[dimension.key]
      if (!bandKey || !bandKeysByDimension.get(dimension.key)?.has(bandKey)) {
        issues.push({
          type: 'matrix_invalid_band',
          message: `A manual override references an unknown band for "${dimension.label}".`,
          dimension_key: dimension.key,
          combination: cell.combination,
        })
      }
    }

    if (!classificationKeys.has(cell.classification_key)) {
      issues.push({
        type: 'matrix_invalid_classification',
        message: `A manual override references unknown classification "${cell.classification_key}".`,
        classification_key: cell.classification_key,
        combination: cell.combination,
      })
    } else {
      referencedClassificationKeys.add(cell.classification_key)
    }
  }

  for (const cell of normalized.classification_matrix ?? []) {
    for (const dimension of normalized.dimensions) {
      const bandKey = cell.combination[dimension.key]
      if (!bandKey || bandKey === '*') continue
      if (!bandKeysByDimension.get(dimension.key)?.has(bandKey)) {
        issues.push({
          type: 'matrix_invalid_band',
          message: `A generated matrix row references an unknown band for "${dimension.label}".`,
          dimension_key: dimension.key,
          combination: cell.combination,
        })
      }
    }

    if (!classificationKeys.has(cell.classification_key)) {
      issues.push({
        type: 'matrix_invalid_classification',
        message: `A generated matrix row references unknown classification "${cell.classification_key}".`,
        classification_key: cell.classification_key,
        combination: cell.combination,
      })
    }
  }

  for (const [signature, count] of overrideMap.entries()) {
    if (count > 1) {
      const combination = Object.fromEntries(signature.split('|').map((item) => item.split(':'))) as Record<string, string>
      issues.push({
        type: 'matrix_duplicate_combination',
        message: 'A manual override combination is defined more than once.',
        combination,
      })
    }
  }

  let mapped = 0
  let mappedManual = 0
  let mappedGenerated = 0
  let unresolved = 0
  let evaluatedProfiles = 0
  let analysisMode: ScoringCoverageReport['analysis_mode'] = 'exhaustive'

  if (totalCombinations <= MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS) {
    const combinations = buildClassificationCombinations(normalized)
    evaluatedProfiles = combinations.length

    for (const combination of combinations) {
      const resolution = resolveClassificationCombination(normalized, combination)
      if (resolution.status === 'matched') {
        mapped += 1
        if (resolution.source === 'override') mappedManual += 1
        else mappedGenerated += 1
        referencedClassificationKeys.add(resolution.classification_key)
        continue
      }

      unresolved += 1
      issues.push({
        type: resolution.status === 'ambiguous' ? 'classification_ambiguous' : 'classification_no_match',
        message:
          resolution.status === 'ambiguous'
            ? 'A competency-band combination resolves to multiple classifications.'
            : 'A competency-band combination does not resolve to any classification.',
        combination,
      })
    }
  } else {
    analysisMode = 'rules'
    const decisionDimensionKeys = getDecisionDimensionKeys(normalized)
    const defaultClassifications = normalized.classifications.filter(
      (classification) => getClassificationLogicSummary(classification).isPassiveDefault
    )
    const decisionProfileTotal = getClassificationCombinationCount(normalized, { dimensionKeys: decisionDimensionKeys })
    evaluatedProfiles = Math.min(decisionProfileTotal, MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS)

    if (decisionDimensionKeys.length > 0 && decisionProfileTotal <= MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS) {
      const profilePage = buildCombinationPage(normalized, {
        dimensionKeys: decisionDimensionKeys,
        wildcardOtherDimensions: true,
        limit: decisionProfileTotal,
      })
      const multiplier = decisionDimensionKeys.reduce((currentMultiplier, dimensionKey) => {
        return currentMultiplier * Math.max(1, getBandOptionsForDimension(normalized, dimensionKey).length)
      }, 1)
      const exactMultiplicity = Math.max(1, Math.round(totalCombinations / Math.max(1, multiplier)))

      for (const combination of profilePage.rows) {
        const resolution = resolveClassificationCombination(normalized, combination)
        if (resolution.status === 'matched') {
          mapped += exactMultiplicity
          if (resolution.source === 'override') mappedManual += 1
          else mappedGenerated += exactMultiplicity
          referencedClassificationKeys.add(resolution.classification_key)
          continue
        }

        unresolved += exactMultiplicity
        issues.push({
          type: resolution.status === 'ambiguous' ? 'classification_ambiguous' : 'classification_no_match',
          message:
            resolution.status === 'ambiguous'
              ? 'A grouped rule profile resolves to multiple classifications.'
              : 'A grouped rule profile does not resolve to any classification.',
          combination,
        })
      }
    } else if (defaultClassifications.length === 1) {
      mapped = totalCombinations
      mappedGenerated = totalCombinations
      referencedClassificationKeys.add(defaultClassifications[0].key)
    } else {
      unresolved = totalCombinations
      issues.push({
        type: 'classification_no_match',
        message:
          'This assessment is too large for exhaustive matrix coverage and needs exactly one default fallback classification to validate safely.',
      })
    }
  }

  for (const classification of normalized.classifications) {
    if (!referencedClassificationKeys.has(classification.key)) {
      issues.push({
        type: 'matrix_unreachable_classification',
        message: `Classification "${classification.label}" is not used in the matrix.`,
        classification_key: classification.key,
      })
    }
  }

  const duplicateCombinations = Array.from(overrideMap.values()).filter((count) => count > 1).length
  const missingCombinations = Math.max(0, totalCombinations - mapped)

  return {
    ok: issues.length === 0,
    combinations_total: totalCombinations,
    combinations_mapped: mapped,
    manual_combinations: mappedManual,
    generated_combinations: mappedGenerated,
    unresolved_combinations: unresolved || missingCombinations,
    missing_combinations: missingCombinations,
    duplicate_combinations: duplicateCombinations,
    analysis_mode: analysisMode,
    evaluated_profiles: evaluatedProfiles,
    issues,
  }
}

export function upgradeScoringConfigToV2(config: ScoringConfig): ScoringConfig {
  const normalized = normalizeScoringConfig(config)
  if (normalized.version === 2) return normalized

  const matrix = buildClassificationCombinations({
    ...normalized,
    version: 2,
    classification_matrix: [],
  }).flatMap((combination) => {
    const scores = Object.fromEntries(
      normalized.dimensions.map((dimension) => {
        const bandKey = combination[dimension.key]
        const band = getDimensionBands(normalized, dimension).find((item) => item.key === bandKey)
        const midpoint = band ? roundToSingleDecimal((band.min_score + (band.max_score ?? band.min_score)) / 2) : 0
        return [dimension.key, midpoint]
      })
    )
    const classification = classifyLegacyScores(scores, normalized.classifications)
    if (!classification) return []
    return [
      {
        combination,
        classification_key: classification.key,
        source: 'manual' as const,
      },
    ]
  })

  return {
    ...normalized,
    version: 2,
    classification_overrides: matrix,
    classification_matrix: [],
  }
}

type CombinationDraftResult =
  | { status: 'assigned'; cell: ScoringMatrixCell }
  | { status: 'ambiguous' }
  | { status: 'no_match' }

export type MatrixDraftGenerationSummary = {
  assigned: number
  left_blank: number
  changed: number
  ambiguous: number
  no_match: number
}

export type MatrixDraftGenerationResult = {
  config: ScoringConfig
  summary: MatrixDraftGenerationSummary
}

function getBandLabel(config: ScoringConfig, dimensionKey: string, bandKey: string) {
  const dimension = config.dimensions.find((item) => item.key === dimensionKey)
  if (!dimension) return bandKey
  const band = getDimensionBands(config, dimension).find((item) => item.key === bandKey)
  return band?.label ?? bandKey
}

function scoreCombinationForClassification(
  config: ScoringConfig,
  combination: Record<string, string>,
  classification: ScoringClassification
): { score: number; rationale: string[]; blocked: boolean } {
  const rationale: string[] = []

  for (const exclusion of classification.excluded_signals ?? []) {
    if (combination[exclusion.dimension] !== exclusion.band_key) continue
    return {
      score: 0,
      blocked: true,
      rationale: [
        `Excluded because ${exclusion.dimension} is ${getBandLabel(config, exclusion.dimension, exclusion.band_key)}.`,
      ],
    }
  }

  let score = 0
  for (const signal of classification.preferred_signals ?? []) {
    if (combination[signal.dimension] !== signal.band_key) continue
    score += signal.weight
    rationale.push(
      `Matched ${signal.dimension} = ${getBandLabel(config, signal.dimension, signal.band_key)} (+${signal.weight}).`
    )
  }

  if (classification.automation_rationale) rationale.push(classification.automation_rationale)

  return { score, rationale, blocked: false }
}

function generateDraftCellForCombination(
  config: ScoringConfig,
  combination: Record<string, string>
): CombinationDraftResult {
  const matches = config.classifications
    .map((classification) => {
      const evaluation = scoreCombinationForClassification(config, combination, classification)
      return { classification, ...evaluation }
    })
    .filter((candidate) => !candidate.blocked && candidate.score > 0)
    .sort((left, right) => right.score - left.score)

  if (matches.length === 0) return { status: 'no_match' }
  if (matches.length > 1 && matches[0].score === matches[1].score) return { status: 'ambiguous' }

  const winner = matches[0]
  return {
    status: 'assigned',
    cell: {
      combination,
      classification_key: winner.classification.key,
      source: 'generated',
      rationale: [`Auto-matched to ${winner.classification.label}.`, ...winner.rationale],
    },
  }
}

export function clearGeneratedClassificationMatrixCells(config: ScoringConfig): ScoringConfig {
  const normalized = normalizeScoringConfig(config)
  return {
    ...normalized,
    classification_matrix: [],
  }
}

export function generateDraftClassificationMatrix(
  config: ScoringConfig,
  options: { filters?: Record<string, string> } = {}
): MatrixDraftGenerationResult {
  const normalized = normalizeScoringConfig(config)
  const exactCombinationCount = getClassificationCombinationCount(normalized, { filters: options.filters })
  const decisionDimensionKeys = Array.from(
    new Set([
      ...getDecisionDimensionKeys(normalized),
      ...Object.entries(options.filters ?? {})
        .filter(([, bandKey]) => !!bandKey)
        .map(([dimensionKey]) => dimensionKey),
    ])
  )
  const previewPage =
    exactCombinationCount <= MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS
      ? buildCombinationPage(normalized, {
          filters: options.filters,
          limit: exactCombinationCount,
        })
      : buildCombinationPage(normalized, {
          dimensionKeys: decisionDimensionKeys,
          filters: options.filters,
          wildcardOtherDimensions: true,
          limit: MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS,
        })
  const combinations = previewPage.rows
  const previousGeneratedBySignature = new Map(
    (normalized.classification_matrix ?? [])
      .filter((cell) => cell.source === 'generated')
      .map((cell) => [makeCombinationSignature(normalized.dimensions, cell.combination), cell])
  )
  const overrideSignatures = new Set(
    (normalized.classification_overrides ?? []).map((cell) => makeCombinationSignature(normalized.dimensions, cell.combination))
  )

  const generatedCells: ScoringMatrixCell[] = []
  let ambiguous = 0
  let noMatch = 0
  let changed = 0

  for (const combination of combinations) {
    const signature = makeCombinationSignature(normalized.dimensions, combination)
    if (overrideSignatures.has(signature)) continue

    const draft = generateDraftCellForCombination(normalized, combination)
    if (draft.status === 'ambiguous') {
      ambiguous += 1
      if (previousGeneratedBySignature.has(signature)) changed += 1
      continue
    }
    if (draft.status === 'no_match') {
      noMatch += 1
      if (previousGeneratedBySignature.has(signature)) changed += 1
      continue
    }

    const previous = previousGeneratedBySignature.get(signature)
    if (
      !previous ||
      previous.classification_key !== draft.cell.classification_key ||
      JSON.stringify(previous.rationale ?? []) !== JSON.stringify(draft.cell.rationale ?? [])
    ) {
      changed += 1
    }
    generatedCells.push(draft.cell)
  }

  return {
    config: {
      ...normalized,
      classification_matrix: generatedCells,
    },
    summary: {
      assigned: generatedCells.length,
      left_blank: Math.max(0, combinations.length - generatedCells.length),
      changed,
      ambiguous,
      no_match: noMatch,
    },
  }
}

export function analyzeScoringConfig(
  config: ScoringConfig,
  questions: ActiveQuestion[]
): {
  config: ScoringConfig
  coverage: ScoringCoverageReport
  checks: Array<{ label: string; pass: boolean; message: string; blocking: boolean }>
  canPublish: boolean
} {
  const normalized = normalizeScoringConfig(config)
  const coverage = analyzeScoringCoverage(normalized)
  const dimensions = normalized.dimensions
  const classifications = normalized.classifications
  const dimensionCounts = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension.key,
      questions.filter((question) => question.dimension === dimension.key && question.is_active !== false).length,
    ])
  ) as Record<string, number>
  const dimensionsWithFewItems = dimensions.filter((dimension) => (dimensionCounts[dimension.key] ?? 0) < 3)
  const dimensionsWithNoBands = dimensions.filter((dimension) => getDimensionBands(normalized, dimension).length === 0)
  const hasScale = !!normalized.scale_config
  const hasClassifications = classifications.length > 0
  const hasClassificationLogic =
    classifications.some((classification) => {
      const summary = getClassificationLogicSummary(classification)
      return summary.hasConditions || summary.preferredSignals.length > 0 || summary.excludedSignals.length > 0 || summary.isPassiveDefault
    }) ||
    (normalized.classification_overrides?.length ?? 0) > 0 ||
    (normalized.classification_matrix?.length ?? 0) > 0
  const checks = [
    {
      label: 'Has competencies',
      pass: dimensions.length > 0,
      message: dimensions.length > 0 ? `${dimensions.length} competencies configured` : 'No competencies configured yet.',
      blocking: true,
    },
    {
      label: 'Competencies have 3+ items',
      pass: dimensionsWithFewItems.length === 0,
      message:
        dimensionsWithFewItems.length === 0
          ? 'All competencies have at least 3 active questions.'
          : `${dimensionsWithFewItems.length} competencies have fewer than 3 active questions.`,
      blocking: true,
    },
    {
      label: 'Band meanings configured',
      pass: dimensionsWithNoBands.length === 0,
      message:
        dimensionsWithNoBands.length === 0
          ? 'Every competency has score-meaning bands.'
          : `${dimensionsWithNoBands.length} competencies are missing score-meaning bands.`,
      blocking: true,
    },
    {
      label: 'Scale configured',
      pass: hasScale,
      message: hasScale ? `${normalized.scale_config!.points}-point scale configured.` : 'No response scale configured.',
      blocking: true,
    },
    {
      label: 'Classifications configured',
      pass: hasClassifications,
      message: hasClassifications ? `${classifications.length} classifications available.` : 'No classifications configured.',
      blocking: true,
    },
    {
      label: 'Classification logic configured',
      pass: hasClassificationLogic,
      message: hasClassificationLogic
        ? 'Classification rules or exact overrides are configured.'
        : 'Add classification signals, a default fallback, or exact overrides.',
      blocking: true,
    },
    {
      label: 'Coverage complete',
      pass: coverage.ok,
      message: coverage.ok
        ? `All ${coverage.combinations_total} band combinations resolve to one classification.`
        : `${coverage.issues.length} coverage issues detected.`,
      blocking: true,
    },
  ]

  return {
    config: normalized,
    coverage,
    checks,
    canPublish: checks.every((check) => !check.blocking || check.pass),
  }
}
