import type {
  ScoringConfig,
  ScoringDimension,
  ScoringMatrixCell,
} from '@/utils/assessments/types'
import { DEFAULT_SCALE_CONFIG } from '@/utils/assessments/scoring-config/shared'
import {
  getDimensionBands,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config/normalize'

export function makeCombinationSignature(
  dimensions: ScoringDimension[],
  combination: Record<string, string>
) {
  return dimensions
    .map((dimension) => `${dimension.key}:${combination[dimension.key] ?? ''}`)
    .join('|')
}

export function findClassificationMatrixCell(
  config: ScoringConfig,
  combination: Record<string, string>
): ScoringMatrixCell | null {
  const normalized = normalizeScoringConfig(config)
  const signature = makeCombinationSignature(normalized.dimensions, combination)

  return (
    normalized.classification_matrix?.find(
      (cell) =>
        makeCombinationSignature(normalized.dimensions, cell.combination) === signature
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
      (cell) =>
        makeCombinationSignature(normalized.dimensions, cell.combination) === signature
    ) ?? null
  )
}

export function getDimensionBandLabel(
  config: ScoringConfig,
  dimension: ScoringDimension,
  bandKey: string
) {
  const matched = getDimensionBands(config, dimension).find((band) => band.key === bandKey)
  return matched?.label ?? bandKey
}

export function getDefaultScaleMax(config: ScoringConfig) {
  return config.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points
}
