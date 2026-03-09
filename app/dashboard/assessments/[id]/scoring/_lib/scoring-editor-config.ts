import {
  DEFAULT_SCALE_CONFIG,
  getDimensionBands,
} from '@/utils/assessments/scoring-config'
import type {
  ScoringBand,
  ScoringClassification,
  ScoringClassificationExclusion,
  ScoringClassificationSignal,
  ScoringConfig,
  ScoringDimension,
} from '@/utils/assessments/types'
import { toKey } from './scoring-editor-utils'

export function getDefaultSignalPlacement(currentConfig: ScoringConfig, dimensionKey?: string) {
  const dimension =
    currentConfig.dimensions.find((item) => item.key === dimensionKey) ?? currentConfig.dimensions[0] ?? null
  const bandKey = dimension ? getDimensionBands(currentConfig, dimension)[0]?.key ?? '' : ''

  return {
    dimensionKey: dimension?.key ?? '',
    bandKey,
  }
}

export function withScalePoints(currentConfig: ScoringConfig, points: number): ScoringConfig {
  return {
    ...currentConfig,
    version: 2,
    scale_config: {
      points: points as NonNullable<ScoringConfig['scale_config']>['points'],
      labels: Array.from({ length: points }, (_, index) => {
        return (
          currentConfig.scale_config?.labels[index] ??
          DEFAULT_SCALE_CONFIG.labels[index] ??
          `Option ${index + 1}`
        )
      }),
    },
  }
}

export function withScaleLabel(currentConfig: ScoringConfig, index: number, value: string): ScoringConfig {
  const points = currentConfig.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points

  return {
    ...currentConfig,
    scale_config: {
      points,
      labels: Array.from({ length: points }, (_, currentIndex) => {
        return currentIndex === index
          ? value
          : currentConfig.scale_config?.labels[currentIndex] ??
              DEFAULT_SCALE_CONFIG.labels[currentIndex]
      }),
    },
  }
}

function withUpdatedDimensionBands(
  currentConfig: ScoringConfig,
  dimensionKey: string,
  updater: (bands: ScoringBand[]) => ScoringBand[]
): ScoringConfig {
  return {
    ...currentConfig,
    dimensions: currentConfig.dimensions.map((dimension) =>
      dimension.key === dimensionKey
        ? { ...dimension, bands: updater(getDimensionBands(currentConfig, dimension)) }
        : dimension
    ),
  }
}

export function withAddedBand(
  currentConfig: ScoringConfig,
  dimension: ScoringDimension,
  scalePoints: number
): ScoringConfig {
  const bands = getDimensionBands(currentConfig, dimension)
  const fallbackIndex = bands.length + 1

  return withUpdatedDimensionBands(currentConfig, dimension.key, (currentBands) => [
    ...currentBands,
    {
      key: `band_${fallbackIndex}`,
      label: `Band ${fallbackIndex}`,
      min_score: currentBands.at(-1)?.max_score ?? 1,
      max_score: scalePoints,
      meaning: '',
    },
  ])
}

export function withUpdatedBand(
  currentConfig: ScoringConfig,
  dimensionKey: string,
  bandKey: string,
  patch: Partial<ScoringBand>
): ScoringConfig {
  return withUpdatedDimensionBands(currentConfig, dimensionKey, (bands) =>
    bands.map((band) => (band.key === bandKey ? { ...band, ...patch } : band))
  )
}

export function withRemovedBand(
  currentConfig: ScoringConfig,
  dimensionKey: string,
  bandKey: string
): ScoringConfig {
  return withUpdatedDimensionBands(currentConfig, dimensionKey, (bands) =>
    bands.filter((band) => band.key !== bandKey)
  )
}

export function withUpdatedClassification(
  currentConfig: ScoringConfig,
  classificationKey: string,
  patch: Partial<ScoringClassification>
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) =>
      classification.key === classificationKey ? { ...classification, ...patch } : classification
    ),
  }
}

export function withAddedClassification(
  currentConfig: ScoringConfig,
  label: string
): ScoringConfig {
  const key = toKey(label, `classification_${currentConfig.classifications.length + 1}`)

  return {
    ...currentConfig,
    classifications: [
      ...currentConfig.classifications,
      {
        key,
        label,
        description: '',
        automation_rationale: '',
        conditions: [],
        recommendations: [],
        preferred_signals: [],
        excluded_signals: [],
      },
    ],
  }
}

export function withDeletedClassification(
  currentConfig: ScoringConfig,
  classificationKey: string
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.filter(
      (classification) => classification.key !== classificationKey
    ),
    classification_overrides: (currentConfig.classification_overrides ?? []).filter(
      (cell) => cell.classification_key !== classificationKey
    ),
    classification_matrix: (currentConfig.classification_matrix ?? []).filter(
      (cell) => cell.classification_key !== classificationKey
    ),
  }
}

export function withAddedRecommendation(
  currentConfig: ScoringConfig,
  classificationKey: string,
  recommendation: string
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) =>
      classification.key === classificationKey
        ? {
            ...classification,
            recommendations: [...classification.recommendations, recommendation],
          }
        : classification
    ),
  }
}

export function withUpdatedRecommendation(
  currentConfig: ScoringConfig,
  classificationKey: string,
  index: number,
  value: string
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) =>
      classification.key === classificationKey
        ? {
            ...classification,
            recommendations: classification.recommendations.map(
              (recommendation, recommendationIndex) =>
                recommendationIndex === index ? value : recommendation
            ),
          }
        : classification
    ),
  }
}

export function withRemovedRecommendation(
  currentConfig: ScoringConfig,
  classificationKey: string,
  index: number
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) =>
      classification.key === classificationKey
        ? {
            ...classification,
            recommendations: classification.recommendations.filter(
              (_, recommendationIndex) => recommendationIndex !== index
            ),
          }
        : classification
    ),
  }
}

export function withAddedPreferredSignal(
  currentConfig: ScoringConfig,
  classificationKey: string
): ScoringConfig {
  const placement = getDefaultSignalPlacement(currentConfig)
  if (!placement.dimensionKey || !placement.bandKey) return currentConfig

  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) =>
      classification.key === classificationKey
        ? {
            ...classification,
            preferred_signals: [
              ...(classification.preferred_signals ?? []),
              { dimension: placement.dimensionKey, band_key: placement.bandKey, weight: 1 },
            ],
          }
        : classification
    ),
  }
}

export function withUpdatedPreferredSignal(
  currentConfig: ScoringConfig,
  classificationKey: string,
  index: number,
  patch: Partial<ScoringClassificationSignal>
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) => {
      if (classification.key !== classificationKey) return classification

      const signals = [...(classification.preferred_signals ?? [])]
      const existing = signals[index]
      if (!existing) return classification

      const nextDimension = patch.dimension ?? existing.dimension
      const placement = getDefaultSignalPlacement(currentConfig, nextDimension)
      signals[index] = {
        ...existing,
        ...patch,
        dimension: nextDimension,
        band_key:
          patch.dimension && patch.dimension !== existing.dimension
            ? placement.bandKey
            : patch.band_key ?? existing.band_key,
        weight: patch.weight ?? existing.weight,
      }

      return { ...classification, preferred_signals: signals }
    }),
  }
}

export function withRemovedPreferredSignal(
  currentConfig: ScoringConfig,
  classificationKey: string,
  index: number
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) =>
      classification.key === classificationKey
        ? {
            ...classification,
            preferred_signals: (classification.preferred_signals ?? []).filter(
              (_, signalIndex) => signalIndex !== index
            ),
          }
        : classification
    ),
  }
}

export function withAddedExcludedSignal(
  currentConfig: ScoringConfig,
  classificationKey: string
): ScoringConfig {
  const placement = getDefaultSignalPlacement(currentConfig)
  if (!placement.dimensionKey || !placement.bandKey) return currentConfig

  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) =>
      classification.key === classificationKey
        ? {
            ...classification,
            excluded_signals: [
              ...(classification.excluded_signals ?? []),
              { dimension: placement.dimensionKey, band_key: placement.bandKey },
            ],
          }
        : classification
    ),
  }
}

export function withUpdatedExcludedSignal(
  currentConfig: ScoringConfig,
  classificationKey: string,
  index: number,
  patch: Partial<ScoringClassificationExclusion>
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) => {
      if (classification.key !== classificationKey) return classification

      const signals = [...(classification.excluded_signals ?? [])]
      const existing = signals[index]
      if (!existing) return classification

      const nextDimension = patch.dimension ?? existing.dimension
      const placement = getDefaultSignalPlacement(currentConfig, nextDimension)
      signals[index] = {
        ...existing,
        ...patch,
        dimension: nextDimension,
        band_key:
          patch.dimension && patch.dimension !== existing.dimension
            ? placement.bandKey
            : patch.band_key ?? existing.band_key,
      }

      return { ...classification, excluded_signals: signals }
    }),
  }
}

export function withRemovedExcludedSignal(
  currentConfig: ScoringConfig,
  classificationKey: string,
  index: number
): ScoringConfig {
  return {
    ...currentConfig,
    classifications: currentConfig.classifications.map((classification) =>
      classification.key === classificationKey
        ? {
            ...classification,
            excluded_signals: (classification.excluded_signals ?? []).filter(
              (_, signalIndex) => signalIndex !== index
            ),
          }
        : classification
    ),
  }
}

export function withCombinationClassification(
  currentConfig: ScoringConfig,
  combination: Record<string, string>,
  classificationKey: string
): ScoringConfig {
  const existingIndex = (currentConfig.classification_overrides ?? []).findIndex((cell) =>
    currentConfig.dimensions.every(
      (dimension) => cell.combination[dimension.key] === combination[dimension.key]
    )
  )
  const nextOverrides = [...(currentConfig.classification_overrides ?? [])]

  if (!classificationKey) {
    if (existingIndex >= 0) nextOverrides.splice(existingIndex, 1)
  } else if (existingIndex >= 0) {
    nextOverrides[existingIndex] = {
      combination,
      classification_key: classificationKey,
      source: 'manual',
    }
  } else {
    nextOverrides.push({ combination, classification_key: classificationKey, source: 'manual' })
  }

  return {
    ...currentConfig,
    classification_overrides: nextOverrides,
  }
}
