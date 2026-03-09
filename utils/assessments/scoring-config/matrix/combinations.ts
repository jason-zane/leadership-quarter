import type {
  ScoringConfig,
} from '@/utils/assessments/types'
import {
  getDimensionBands,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config/normalize'

function getDimensionKeys(config: ScoringConfig, dimensionKeys?: string[]) {
  const normalized = normalizeScoringConfig(config)
  if (!dimensionKeys?.length) {
    return normalized.dimensions.map((dimension) => dimension.key)
  }

  return normalized.dimensions
    .filter((dimension) => dimensionKeys.includes(dimension.key))
    .map((dimension) => dimension.key)
}

export function getBandOptionsForDimension(
  config: ScoringConfig,
  dimensionKey: string,
  filters: Record<string, string> = {}
) {
  const normalized = normalizeScoringConfig(config)
  const dimension = normalized.dimensions.find((item) => item.key === dimensionKey)
  if (!dimension) return []

  const filteredBandKey = filters[dimensionKey]
  if (filteredBandKey) return [filteredBandKey]

  return getDimensionBands(normalized, dimension)
    .map((band) => band.key ?? '')
    .filter(Boolean)
}

export function getClassificationCombinationCount(
  config: ScoringConfig,
  options: { dimensionKeys?: string[]; filters?: Record<string, string> } = {}
) {
  const normalized = normalizeScoringConfig(config)
  const dimensionKeys = getDimensionKeys(normalized, options.dimensionKeys)
  if (dimensionKeys.length === 0) return 0

  return dimensionKeys.reduce((total, dimensionKey) => {
    const optionsForDimension = getBandOptionsForDimension(
      normalized,
      dimensionKey,
      options.filters
    )
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
  const dimensions = normalized.dimensions.filter((dimension) =>
    dimensionKeys.includes(dimension.key)
  )
  const optionSets = dimensions.map((dimension) => ({
    key: dimension.key,
    options: getBandOptionsForDimension(normalized, dimension.key, options.filters),
  }))
  const total = optionSets.reduce(
    (count, set) => count * Math.max(1, set.options.length),
    1
  )
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
        options.wildcardOtherDimensions
          ? '*'
          : getBandOptionsForDimension(normalized, dimension.key, options.filters)[0] ?? '',
      ])
    ) as Record<string, string>

    optionSets.forEach((set, optionIndex) => {
      combination[set.key] = set.options[digits[optionIndex]] ?? ''
    })

    rows.push(combination)
  }

  return { total, rows }
}

function cartesian<T>(items: T[][]): T[][] {
  if (items.length === 0) return [[]]
  return items.reduce<T[][]>(
    (acc, current) => acc.flatMap((prefix) => current.map((item) => [...prefix, item])),
    [[]]
  )
}

export function buildClassificationCombinations(
  config: ScoringConfig
): Array<Record<string, string>> {
  const normalized = normalizeScoringConfig(config)
  const dimensionBands = normalized.dimensions.map((dimension) =>
    getDimensionBands(normalized, dimension).map((band) => ({
      dimensionKey: dimension.key,
      bandKey: band.key!,
    }))
  )

  return cartesian(dimensionBands).map((items) =>
    Object.fromEntries(items.map((item) => [item.dimensionKey, item.bandKey]))
  )
}
