import { getDimensionBands, normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import type {
  ScoringBand,
  ScoringClassification,
  ScoringConfig,
  ScoringDimension,
  ScoringMatrixCell,
} from '@/utils/assessments/types'
import {
  CSV_HEADERS,
  type CsvRow,
  copyClassification,
  decodeCombination,
  parseCsvTable,
  splitList,
} from '@/utils/assessments/scoring-csv/shared'

export type ScoringCsvImportResult = {
  config: ScoringConfig | null
  errors: string[]
}

type DimensionState = {
  key: string
  label: string
  description?: string
  question_keys: string[]
  bands: ScoringBand[]
}

type ParseState = {
  current: ScoringConfig
  currentDimensionMap: Map<string, ScoringDimension>
  dimensionStates: Map<string, DimensionState>
  touchedBandDimensions: Set<string>
  classificationMap: Map<string, ScoringClassification>
  scaleLabels: Map<number, string>
  matrixRows: ScoringMatrixCell[]
  overrideRows: ScoringMatrixCell[]
  errors: string[]
}

const BASE_ROW_TYPES = new Set(['scale', 'dimension', 'band', 'classification'])

function getRowLabel(rowIndex: number) {
  return `Row ${rowIndex + 2}`
}

function createDimensionStates(
  current: ScoringConfig
): Map<string, DimensionState> {
  return new Map(
    current.dimensions.map((dimension) => [
      dimension.key,
      {
        key: dimension.key,
        label: dimension.label,
        description: dimension.description,
        question_keys: [...dimension.question_keys],
        bands: getDimensionBands(current, dimension).map((band) => ({ ...band })),
      },
    ])
  )
}

function mapCsvRows(
  headerRow: string[],
  bodyRows: string[][]
): { rows: CsvRow[]; errors: string[] } {
  const headerIndex = new Map(
    headerRow.map((header, index) => [header.trim(), index])
  )

  if (!headerIndex.has('row_type')) {
    return {
      rows: [],
      errors: ['CSV file must include a row_type column.'],
    }
  }

  return {
    rows: bodyRows.map((fields) =>
      Object.fromEntries(
        CSV_HEADERS.map((header) => [header, fields[headerIndex.get(header) ?? -1] ?? ''])
      ) as CsvRow
    ),
    errors: [],
  }
}

function requireDimensionState(
  state: ParseState,
  rowIndex: number,
  dimensionKey: string
) {
  if (!state.currentDimensionMap.has(dimensionKey)) {
    state.errors.push(
      `${getRowLabel(rowIndex)} references unknown competency "${dimensionKey}".`
    )
    return null
  }

  return state.dimensionStates.get(dimensionKey) ?? null
}

function applyScaleRow(state: ParseState, row: CsvRow, rowIndex: number) {
  const valueIndex = Number(row.scale_value)
  if (!Number.isFinite(valueIndex) || valueIndex < 1) {
    state.errors.push(`${getRowLabel(rowIndex)} has an invalid scale_value.`)
    return
  }

  state.scaleLabels.set(valueIndex, row.scale_label.trim())
}

function applyDimensionRow(state: ParseState, row: CsvRow, rowIndex: number) {
  const dimensionKey = row.dimension_key.trim()
  const dimensionState = requireDimensionState(state, rowIndex, dimensionKey)
  if (!dimensionState) return

  dimensionState.label = row.dimension_label.trim() || dimensionState.label
  dimensionState.description = row.dimension_description.trim() || undefined
  dimensionState.question_keys = row.question_keys
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

function applyBandRow(state: ParseState, row: CsvRow, rowIndex: number) {
  const dimensionKey = row.dimension_key.trim()
  const dimensionState = requireDimensionState(state, rowIndex, dimensionKey)
  if (!dimensionState) return

  if (!state.touchedBandDimensions.has(dimensionKey)) {
    dimensionState.bands = []
    state.touchedBandDimensions.add(dimensionKey)
  }

  const bandKey = row.band_key.trim()
  const bandLabel = row.band_label.trim()
  const minScore = Number(row.band_min_score)
  const maxScore = row.band_max_score.trim() ? Number(row.band_max_score) : undefined

  if (!bandKey || !bandLabel || !Number.isFinite(minScore)) {
    state.errors.push(`${getRowLabel(rowIndex)} has an invalid band definition.`)
    return
  }

  dimensionState.bands.push({
    key: bandKey,
    label: bandLabel,
    min_score: minScore,
    max_score: maxScore,
    meaning: row.band_meaning.trim() || undefined,
  })
}

function applyClassificationRow(state: ParseState, row: CsvRow, rowIndex: number) {
  const classificationKey = row.classification_key.trim()
  const classificationLabel = row.classification_label.trim()

  if (!classificationKey || !classificationLabel) {
    state.errors.push(
      `${getRowLabel(rowIndex)} has an invalid classification definition.`
    )
    return
  }

  state.classificationMap.set(classificationKey, {
    key: classificationKey,
    label: classificationLabel,
    conditions: [],
    recommendations: [],
    description: row.classification_description.trim() || undefined,
    automation_rationale:
      row.classification_automation_rationale.trim() || undefined,
    preferred_signals: [],
    excluded_signals: [],
  })
}

function applyRecommendationRow(state: ParseState, row: CsvRow, rowIndex: number) {
  const classificationKey = row.classification_key.trim()
  const classification = state.classificationMap.get(classificationKey)

  if (!classification) {
    state.errors.push(
      `${getRowLabel(rowIndex)} references unknown classification "${classificationKey}".`
    )
    return
  }

  if (row.recommendation_text.trim()) {
    classification.recommendations.push(row.recommendation_text.trim())
  }
}

function applySignalRow(state: ParseState, row: CsvRow, rowIndex: number) {
  const classificationKey = row.classification_key.trim()
  const classification = state.classificationMap.get(classificationKey)

  if (!classification) {
    state.errors.push(
      `${getRowLabel(rowIndex)} references unknown classification "${classificationKey}".`
    )
    return
  }

  const dimensionKey = row.signal_dimension.trim()
  const dimensionState = requireDimensionState(state, rowIndex, dimensionKey)
  if (!dimensionState) return

  const bandKey = row.signal_band_key.trim()
  if (!bandKey || !dimensionState.bands.some((band) => band.key === bandKey)) {
    state.errors.push(
      `${getRowLabel(rowIndex)} references unknown band "${bandKey}" for "${dimensionKey}".`
    )
    return
  }

  if (row.signal_mode === 'preferred') {
    classification.preferred_signals?.push({
      dimension: dimensionKey,
      band_key: bandKey,
      weight: Math.max(0.1, Number(row.signal_weight || 1) || 1),
    })
    return
  }

  if (row.signal_mode === 'excluded') {
    classification.excluded_signals?.push({
      dimension: dimensionKey,
      band_key: bandKey,
    })
    return
  }

  state.errors.push(
    `${getRowLabel(rowIndex)} has an invalid signal_mode "${row.signal_mode}".`
  )
}

function applyMatrixRow(state: ParseState, row: CsvRow, rowIndex: number) {
  const matrixClassificationKey = row.matrix_classification_key.trim()
  const decoded = decodeCombination(
    state.current.dimensions,
    row.matrix_combination.trim()
  )

  if (decoded.errors.length > 0) {
    state.errors.push(
      ...decoded.errors.map((message) => `${getRowLabel(rowIndex)}: ${message}`)
    )
    return
  }

  if (!decoded.combination) return

  for (const dimension of state.current.dimensions) {
    const dimensionState = state.dimensionStates.get(dimension.key)
    const bandKey = decoded.combination[dimension.key]

    if (bandKey !== '*' && !dimensionState?.bands.some((band) => band.key === bandKey)) {
      state.errors.push(
        `${getRowLabel(rowIndex)} references unknown band "${bandKey}" for "${dimension.key}".`
      )
    }
  }

  if (!matrixClassificationKey) return

  if (!state.classificationMap.has(matrixClassificationKey)) {
    state.errors.push(
      `${getRowLabel(rowIndex)} references unknown classification "${matrixClassificationKey}".`
    )
    return
  }

  const nextCell = {
    combination: decoded.combination,
    classification_key: matrixClassificationKey,
    source: row.matrix_source.trim() === 'generated' ? 'generated' : 'manual',
    rationale: splitList(row.matrix_rationale),
  } satisfies ScoringMatrixCell

  if (nextCell.source === 'generated') {
    state.matrixRows.push(nextCell)
    return
  }

  if (Object.values(nextCell.combination).includes('*')) {
    state.errors.push(
      `${getRowLabel(rowIndex)} cannot use "*" in a manual override combination.`
    )
    return
  }

  state.overrideRows.push({ ...nextCell, source: 'manual' })
}

function buildScaleConfig(state: ParseState, rows: CsvRow[]) {
  const scalePoints =
    Number(rows.find((row) => row.row_type === 'scale')?.scale_points) ||
    state.current.scale_config?.points ||
    5

  return {
    points: scalePoints as NonNullable<ScoringConfig['scale_config']>['points'],
    labels: Array.from({ length: scalePoints }, (_, index) =>
      state.scaleLabels.get(index + 1) ??
      state.current.scale_config?.labels[index] ??
      `Option ${index + 1}`
    ),
  }
}

function buildDimensions(state: ParseState) {
  return state.current.dimensions.map((dimension) => {
    const dimensionState = state.dimensionStates.get(dimension.key)

    return {
      key: dimension.key,
      label: dimensionState?.label ?? dimension.label,
      description: dimensionState?.description,
      question_keys: dimensionState?.question_keys ?? [...dimension.question_keys],
      bands: (dimensionState?.bands ?? []).map((band) => ({ ...band })),
    }
  })
}

export function parseScoringConfigCsv(
  text: string,
  currentConfig: ScoringConfig
): ScoringCsvImportResult {
  const table = parseCsvTable(text)
  if (table.length === 0) {
    return { config: null, errors: ['CSV file is empty.'] }
  }

  const [headerRow, ...bodyRows] = table
  const csvRows = mapCsvRows(headerRow, bodyRows)
  if (csvRows.errors.length > 0) {
    return { config: null, errors: csvRows.errors }
  }

  const current = normalizeScoringConfig(currentConfig)
  const state: ParseState = {
    current,
    currentDimensionMap: new Map(
      current.dimensions.map((dimension) => [dimension.key, dimension])
    ),
    dimensionStates: createDimensionStates(current),
    touchedBandDimensions: new Set<string>(),
    classificationMap: new Map<string, ScoringClassification>(),
    scaleLabels: new Map<number, string>(),
    matrixRows: [],
    overrideRows: [],
    errors: [],
  }

  for (const [rowIndex, row] of csvRows.rows.entries()) {
    const rowType = row.row_type.trim()

    if (!rowType) {
      state.errors.push(`${getRowLabel(rowIndex)} is missing row_type.`)
      continue
    }

    if (rowType === 'scale') {
      applyScaleRow(state, row, rowIndex)
      continue
    }

    if (rowType === 'dimension') {
      applyDimensionRow(state, row, rowIndex)
      continue
    }

    if (rowType === 'band') {
      applyBandRow(state, row, rowIndex)
      continue
    }

    if (rowType === 'classification') {
      applyClassificationRow(state, row, rowIndex)
    }
  }

  for (const [rowIndex, row] of csvRows.rows.entries()) {
    const rowType = row.row_type.trim()

    if (rowType === 'recommendation') {
      applyRecommendationRow(state, row, rowIndex)
      continue
    }

    if (rowType === 'signal') {
      applySignalRow(state, row, rowIndex)
      continue
    }

    if (rowType === 'matrix') {
      applyMatrixRow(state, row, rowIndex)
      continue
    }

    if (!BASE_ROW_TYPES.has(rowType)) {
      state.errors.push(
        `${getRowLabel(rowIndex)} has an unknown row_type "${rowType}".`
      )
    }
  }

  if (state.errors.length > 0) {
    return { config: null, errors: state.errors }
  }

  return {
    config: normalizeScoringConfig({
      version: 2,
      scale_config: buildScaleConfig(state, csvRows.rows),
      dimensions: buildDimensions(state),
      classifications: Array.from(state.classificationMap.values()).map(
        (classification) => copyClassification(classification)
      ),
      classification_overrides: state.overrideRows,
      classification_matrix: state.matrixRows,
    }),
    errors: [],
  }
}
