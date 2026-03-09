import type {
  ScoringBand,
  ScoringClassification,
  ScoringClassificationExclusion,
  ScoringClassificationSignal,
  ScoringCondition,
  ScoringConfig,
  ScoringDimension,
  ScoringMatrixCell,
  ScaleConfig,
} from '@/utils/assessments/types'
import {
  DEFAULT_SCALE_CONFIG,
  isObject,
  normalizeScalePoints,
  roundToSingleDecimal,
  toKey,
  toNumber,
} from '@/utils/assessments/scoring-config/shared'

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

function normalizeScaleConfig(value: unknown): ScaleConfig {
  if (!isObject(value)) return { ...DEFAULT_SCALE_CONFIG, labels: [...DEFAULT_SCALE_CONFIG.labels] }

  const points = normalizeScalePoints(value.points)
  const rawLabels = Array.isArray(value.labels) ? value.labels : []
  const labels = Array.from({ length: points }, (_, index) => {
    const next = rawLabels[index]
    return typeof next === 'string' && next.trim()
      ? next
      : DEFAULT_SCALE_CONFIG.labels[index] ?? `Option ${index + 1}`
  })

  return { points, labels }
}

function normalizeClassification(value: unknown, index: number): ScoringClassification | null {
  if (!isObject(value)) return null
  const label = typeof value.label === 'string' ? value.label.trim() : ''
  if (!label) return null
  const key =
    typeof value.key === 'string' && value.key.trim()
      ? value.key.trim()
      : toKey(label, `classification_${index + 1}`)
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
    description:
      typeof value.description === 'string' && value.description.trim() ? value.description.trim() : undefined,
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
      const maxScoreRaw =
        band.max_score === undefined
          ? undefined
          : roundToSingleDecimal(toNumber(band.max_score, minScore))
      return {
        key:
          typeof band.key === 'string' && band.key.trim()
            ? band.key.trim()
            : toKey(label, `band_${index + 1}`),
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
    description:
      typeof value.description === 'string' && value.description.trim() ? value.description.trim() : undefined,
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
      const classificationKey =
        typeof cell.classification_key === 'string' ? cell.classification_key.trim() : ''
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
    value.version === 2 ||
    Array.isArray(value.classification_matrix) ||
    Array.isArray(value.classification_overrides)
      ? 2
      : 1
  const normalizedMatrix =
    version === 2 ? normalizeMatrix(value.classification_matrix, { allowWildcards: true }) : []
  const normalizedOverrides =
    version === 2
      ? normalizeMatrix(value.classification_overrides, {
          allowWildcards: false,
          defaultSource: 'manual',
        })
      : []
  const derivedLegacyOverrides =
    normalizedOverrides.length > 0
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
      version === 2 ? normalizedMatrix.filter((cell) => cell.source === 'generated') : [],
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

export function getBandByScore(
  config: ScoringConfig,
  dimension: ScoringDimension,
  score: number
): ScoringBand | null {
  const bands = getDimensionBands(config, dimension)
  if (bands.length === 0) return null
  const normalizedScore = roundToSingleDecimal(score)
  return (
    bands.find(
      (band) => normalizedScore >= band.min_score && normalizedScore <= (band.max_score ?? normalizedScore)
    ) ?? null
  )
}
