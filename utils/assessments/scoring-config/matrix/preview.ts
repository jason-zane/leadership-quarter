import type { ScoringConfig } from '@/utils/assessments/types'
import { MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS } from '@/utils/assessments/scoring-config/shared'
import { normalizeScoringConfig } from '@/utils/assessments/scoring-config/normalize'
import {
  buildCombinationPage,
  getClassificationCombinationCount,
  getDecisionDimensionKeys,
} from '@/utils/assessments/scoring-config/matrix/combinations'
import { makeCombinationSignature } from '@/utils/assessments/scoring-config/matrix/lookups'
import { resolveClassificationCombination } from '@/utils/assessments/scoring-config/matrix/resolution'

export type MatrixPreviewRow = {
  id: string
  combination: Record<string, string>
  classification_key: string | null
  source: 'manual' | 'generated' | 'unmapped'
  rationale: string[]
  editable: boolean
  grouped: boolean
}

export function buildMatrixPreviewRows(
  config: ScoringConfig,
  options: { filters?: Record<string, string>; offset?: number; limit?: number } = {}
) {
  const normalized = normalizeScoringConfig(config)
  const exactCombinationCount = getClassificationCombinationCount(normalized, {
    filters: options.filters,
  })
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
        classification_key:
          resolution.status === 'matched' ? resolution.classification_key : null,
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
