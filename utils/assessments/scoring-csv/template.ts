import { getDimensionBands, normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import type { ScoringConfig } from '@/utils/assessments/types'
import { copyClassification } from '@/utils/assessments/scoring-csv/shared'

export function buildScoringJsonTemplate(config: ScoringConfig): ScoringConfig {
  const normalized = normalizeScoringConfig(config)

  return {
    version: 2,
    scale_config: normalized.scale_config,
    dimensions: normalized.dimensions.map((dimension) => ({
      ...dimension,
      question_keys: [...dimension.question_keys],
      bands: getDimensionBands(normalized, dimension).map((band) => ({ ...band })),
    })),
    classifications: normalized.classifications.map((classification) =>
      copyClassification(classification)
    ),
    classification_overrides: [],
    classification_matrix: [],
  }
}
