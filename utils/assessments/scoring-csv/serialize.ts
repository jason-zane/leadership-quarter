import type { ScoringConfig } from '@/utils/assessments/types'
import {
  buildCombinationPage,
  findClassificationMatrixCell,
  getClassificationCombinationCount,
  getDecisionDimensionKeys,
  getDimensionBands,
  MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config'
import {
  CSV_HEADERS,
  createEmptyRow,
  csvEscape,
  encodeCombination,
  type CsvRow,
} from '@/utils/assessments/scoring-csv/shared'

function buildTemplateMatrixRows(config: ReturnType<typeof normalizeScoringConfig>) {
  const exactCombinationCount = getClassificationCombinationCount(config)
  const previewRows =
    exactCombinationCount <= MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS
      ? buildCombinationPage(config, {
          limit: exactCombinationCount,
        }).rows
      : buildCombinationPage(config, {
          dimensionKeys: getDecisionDimensionKeys(config),
          wildcardOtherDimensions: true,
          limit: MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS,
        }).rows

  return previewRows.map((combination) => {
    const override = (config.classification_overrides ?? []).find((cell) =>
      Object.entries(combination).every(([dimensionKey, bandKey]) =>
        bandKey === '*' ? true : cell.combination[dimensionKey] === bandKey
      )
    )
    const cell = override ?? findClassificationMatrixCell(config, combination)
    return { combination, cell }
  })
}

function buildPersistedMatrixRows(config: ReturnType<typeof normalizeScoringConfig>) {
  return [
    ...(config.classification_overrides ?? []).map((cell) => ({
      combination: cell.combination,
      cell,
    })),
    ...(config.classification_matrix ?? []).map((cell) => ({
      combination: cell.combination,
      cell,
    })),
  ]
}

export function serializeScoringConfigToCsv(
  config: ScoringConfig,
  options: { template?: boolean } = {}
) {
  const normalized = normalizeScoringConfig(config)
  const rows: CsvRow[] = []

  normalized.scale_config?.labels.forEach((label, index) => {
    const row = createEmptyRow()
    row.row_type = 'scale'
    row.scale_points = String(normalized.scale_config?.points ?? '')
    row.scale_value = String(index + 1)
    row.scale_label = label
    rows.push(row)
  })

  normalized.dimensions.forEach((dimension) => {
    const dimensionRow = createEmptyRow()
    dimensionRow.row_type = 'dimension'
    dimensionRow.dimension_key = dimension.key
    dimensionRow.dimension_label = dimension.label
    dimensionRow.dimension_description = dimension.description ?? ''
    dimensionRow.question_keys = dimension.question_keys.join('|')
    rows.push(dimensionRow)

    getDimensionBands(normalized, dimension).forEach((band) => {
      const bandRow = createEmptyRow()
      bandRow.row_type = 'band'
      bandRow.dimension_key = dimension.key
      bandRow.band_key = band.key ?? ''
      bandRow.band_label = band.label
      bandRow.band_min_score = String(band.min_score)
      bandRow.band_max_score = String(band.max_score ?? '')
      bandRow.band_meaning = band.meaning ?? ''
      rows.push(bandRow)
    })
  })

  normalized.classifications.forEach((classification) => {
    const classificationRow = createEmptyRow()
    classificationRow.row_type = 'classification'
    classificationRow.classification_key = classification.key
    classificationRow.classification_label = classification.label
    classificationRow.classification_description = classification.description ?? ''
    classificationRow.classification_automation_rationale =
      classification.automation_rationale ?? ''
    rows.push(classificationRow)

    classification.recommendations.forEach((recommendation) => {
      const recommendationRow = createEmptyRow()
      recommendationRow.row_type = 'recommendation'
      recommendationRow.classification_key = classification.key
      recommendationRow.recommendation_text = recommendation
      rows.push(recommendationRow)
    })

    ;(classification.preferred_signals ?? []).forEach((signal) => {
      const signalRow = createEmptyRow()
      signalRow.row_type = 'signal'
      signalRow.classification_key = classification.key
      signalRow.signal_mode = 'preferred'
      signalRow.signal_dimension = signal.dimension
      signalRow.signal_band_key = signal.band_key
      signalRow.signal_weight = String(signal.weight)
      rows.push(signalRow)
    })

    ;(classification.excluded_signals ?? []).forEach((signal) => {
      const signalRow = createEmptyRow()
      signalRow.row_type = 'signal'
      signalRow.classification_key = classification.key
      signalRow.signal_mode = 'excluded'
      signalRow.signal_dimension = signal.dimension
      signalRow.signal_band_key = signal.band_key
      rows.push(signalRow)
    })
  })

  const matrixRows = options.template
    ? buildTemplateMatrixRows(normalized)
    : buildPersistedMatrixRows(normalized)

  matrixRows.forEach(({ combination, cell }) => {
    const matrixRow = createEmptyRow()
    matrixRow.row_type = 'matrix'
    matrixRow.matrix_combination = encodeCombination(normalized.dimensions, combination)
    matrixRow.matrix_classification_key = cell?.classification_key ?? ''
    matrixRow.matrix_source = cell?.source ?? ''
    matrixRow.matrix_rationale = (cell?.rationale ?? []).join(' || ')
    rows.push(matrixRow)
  })

  return [
    CSV_HEADERS.join(','),
    ...rows.map((row) =>
      CSV_HEADERS.map((header) => csvEscape(row[header])).join(',')
    ),
  ].join('\n')
}
