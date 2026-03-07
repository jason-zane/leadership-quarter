import type {
  ScoringClassification,
  ScoringConfig,
  ScoringDimension,
  ScoringMatrixCell,
} from '@/utils/assessments/types'
import {
  buildCombinationPage,
  findClassificationMatrixCell,
  getClassificationCombinationCount,
  getDecisionDimensionKeys,
  getDimensionBands,
  MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config'

const CSV_HEADERS = [
  'row_type',
  'scale_points',
  'scale_value',
  'scale_label',
  'dimension_key',
  'dimension_label',
  'dimension_description',
  'question_keys',
  'band_key',
  'band_label',
  'band_min_score',
  'band_max_score',
  'band_meaning',
  'classification_key',
  'classification_label',
  'classification_description',
  'classification_automation_rationale',
  'recommendation_text',
  'signal_mode',
  'signal_dimension',
  'signal_band_key',
  'signal_weight',
  'matrix_combination',
  'matrix_classification_key',
  'matrix_source',
  'matrix_rationale',
] as const

type CsvHeader = (typeof CSV_HEADERS)[number]
type CsvRow = Record<CsvHeader, string>

export type ScoringCsvImportResult = {
  config: ScoringConfig | null
  errors: string[]
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function createEmptyRow(): CsvRow {
  return Object.fromEntries(CSV_HEADERS.map((header) => [header, ''])) as CsvRow
}

function parseCsvTable(text: string): string[][] {
  const rows: string[][] = []
  let currentField = ''
  let currentRow: string[] = []
  let inQuotes = false
  const normalized = text.replace(/^\uFEFF/, '')

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index]

    if (character === '"') {
      if (inQuotes && normalized[index + 1] === '"') {
        currentField += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentField)
      currentField = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && normalized[index + 1] === '\n') index += 1
      currentRow.push(currentField)
      const hasContent = currentRow.some((field) => field.trim())
      if (hasContent) rows.push(currentRow)
      currentRow = []
      currentField = ''
      continue
    }

    currentField += character
  }

  currentRow.push(currentField)
  if (currentRow.some((field) => field.trim())) rows.push(currentRow)
  return rows
}

function encodeCombination(dimensions: ScoringDimension[], combination: Record<string, string>) {
  return dimensions.map((dimension) => `${dimension.key}=${combination[dimension.key] ?? ''}`).join('|')
}

function decodeCombination(
  dimensions: ScoringDimension[],
  value: string
): { combination: Record<string, string> | null; errors: string[] } {
  const errors: string[] = []
  const combination = Object.fromEntries(dimensions.map((dimension) => [dimension.key, ''])) as Record<string, string>
  const expectedDimensionKeys = new Set(dimensions.map((dimension) => dimension.key))
  const providedDimensionKeys = new Set<string>()

  for (const segment of value.split('|').map((item) => item.trim()).filter(Boolean)) {
    const [dimensionKey, ...rest] = segment.split('=')
    const bandKey = rest.join('=').trim()
    const trimmedDimensionKey = dimensionKey?.trim() ?? ''
    if (!trimmedDimensionKey || !bandKey) {
      errors.push(`Invalid matrix combination segment "${segment}".`)
      continue
    }
    if (!expectedDimensionKeys.has(trimmedDimensionKey)) {
      errors.push(`Unknown competency "${trimmedDimensionKey}" in matrix combination.`)
      continue
    }
    combination[trimmedDimensionKey] = bandKey
    providedDimensionKeys.add(trimmedDimensionKey)
  }

  for (const dimension of dimensions) {
    if (!providedDimensionKeys.has(dimension.key)) {
      errors.push(`Matrix combination is missing competency "${dimension.key}".`)
    }
  }

  return { combination: errors.length === 0 ? combination : null, errors }
}

function splitList(value: string) {
  return value
    .split(' || ')
    .map((item) => item.trim())
    .filter(Boolean)
}

function copyClassification(classification: ScoringClassification): ScoringClassification {
  return {
    key: classification.key,
    label: classification.label,
    conditions: [],
    recommendations: [...classification.recommendations],
    description: classification.description,
    automation_rationale: classification.automation_rationale,
    preferred_signals: [...(classification.preferred_signals ?? [])],
    excluded_signals: [...(classification.excluded_signals ?? [])],
  }
}

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
    classifications: normalized.classifications.map((classification) => copyClassification(classification)),
    classification_overrides: [],
    classification_matrix: [],
  }
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
    classificationRow.classification_automation_rationale = classification.automation_rationale ?? ''
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
    ? (() => {
        const exactCombinationCount = getClassificationCombinationCount(normalized)
        const previewRows =
          exactCombinationCount <= MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS
            ? buildCombinationPage(normalized, {
                limit: exactCombinationCount,
              }).rows
            : buildCombinationPage(normalized, {
                dimensionKeys: getDecisionDimensionKeys(normalized),
                wildcardOtherDimensions: true,
                limit: MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS,
              }).rows

        return previewRows.map((combination) => {
          const override = (normalized.classification_overrides ?? []).find(
            (cell) =>
              Object.entries(combination).every(([dimensionKey, bandKey]) =>
                bandKey === '*' ? true : cell.combination[dimensionKey] === bandKey
              )
          )
          const cell = override ?? findClassificationMatrixCell(normalized, combination)
          return { combination, cell }
        })
      })()
    : [
        ...(normalized.classification_overrides ?? []).map((cell) => ({ combination: cell.combination, cell })),
        ...(normalized.classification_matrix ?? []).map((cell) => ({ combination: cell.combination, cell })),
      ]

  matrixRows.forEach(({ combination, cell }) => {
    const matrixRow = createEmptyRow()
    matrixRow.row_type = 'matrix'
    matrixRow.matrix_combination = encodeCombination(normalized.dimensions, combination)
    matrixRow.matrix_classification_key = cell?.classification_key ?? ''
    matrixRow.matrix_source = cell?.source ?? ''
    matrixRow.matrix_rationale = (cell?.rationale ?? []).join(' || ')
    rows.push(matrixRow)
  })

  return [CSV_HEADERS.join(','), ...rows.map((row) => CSV_HEADERS.map((header) => csvEscape(row[header])).join(','))].join('\n')
}

export function parseScoringConfigCsv(text: string, currentConfig: ScoringConfig): ScoringCsvImportResult {
  const table = parseCsvTable(text)
  if (table.length === 0) return { config: null, errors: ['CSV file is empty.'] }

  const [headerRow, ...bodyRows] = table
  const headerIndex = new Map(headerRow.map((header, index) => [header.trim(), index]))
  if (!headerIndex.has('row_type')) {
    return { config: null, errors: ['CSV file must include a row_type column.'] }
  }

  const current = normalizeScoringConfig(currentConfig)
  const currentDimensionMap = new Map(current.dimensions.map((dimension) => [dimension.key, dimension]))
  const dimensionStates = new Map(
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
  const touchedBandDimensions = new Set<string>()
  const classificationMap = new Map<string, ScoringClassification>()
  const scaleLabels = new Map<number, string>()
  const matrixRows: ScoringMatrixCell[] = []
  const overrideRows: ScoringMatrixCell[] = []
  const errors: string[] = []

  const rows = bodyRows.map((fields) =>
    Object.fromEntries(
      CSV_HEADERS.map((header) => [header, fields[headerIndex.get(header) ?? -1] ?? ''])
    ) as CsvRow
  )

  for (const [rowIndex, row] of rows.entries()) {
    const rowType = row.row_type.trim()
    if (!rowType) {
      errors.push(`Row ${rowIndex + 2} is missing row_type.`)
      continue
    }

    if (rowType === 'scale') {
      const valueIndex = Number(row.scale_value)
      if (!Number.isFinite(valueIndex) || valueIndex < 1) {
        errors.push(`Row ${rowIndex + 2} has an invalid scale_value.`)
        continue
      }
      scaleLabels.set(valueIndex, row.scale_label.trim())
      continue
    }

    if (rowType === 'dimension') {
      const dimensionKey = row.dimension_key.trim()
      if (!currentDimensionMap.has(dimensionKey)) {
        errors.push(`Row ${rowIndex + 2} references unknown competency "${dimensionKey}".`)
        continue
      }
      const state = dimensionStates.get(dimensionKey)
      if (!state) continue
      state.label = row.dimension_label.trim() || state.label
      state.description = row.dimension_description.trim() || undefined
      state.question_keys = row.question_keys
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
      continue
    }

    if (rowType === 'band') {
      const dimensionKey = row.dimension_key.trim()
      if (!currentDimensionMap.has(dimensionKey)) {
        errors.push(`Row ${rowIndex + 2} references unknown competency "${dimensionKey}".`)
        continue
      }
      const state = dimensionStates.get(dimensionKey)
      if (!state) continue
      if (!touchedBandDimensions.has(dimensionKey)) {
        state.bands = []
        touchedBandDimensions.add(dimensionKey)
      }
      const bandKey = row.band_key.trim()
      const bandLabel = row.band_label.trim()
      const minScore = Number(row.band_min_score)
      const maxScore = row.band_max_score.trim() ? Number(row.band_max_score) : undefined
      if (!bandKey || !bandLabel || !Number.isFinite(minScore)) {
        errors.push(`Row ${rowIndex + 2} has an invalid band definition.`)
        continue
      }
      state.bands.push({
        key: bandKey,
        label: bandLabel,
        min_score: minScore,
        max_score: maxScore,
        meaning: row.band_meaning.trim() || undefined,
      })
      continue
    }

    if (rowType === 'classification') {
      const classificationKey = row.classification_key.trim()
      const classificationLabel = row.classification_label.trim()
      if (!classificationKey || !classificationLabel) {
        errors.push(`Row ${rowIndex + 2} has an invalid classification definition.`)
        continue
      }
      classificationMap.set(classificationKey, {
        key: classificationKey,
        label: classificationLabel,
        conditions: [],
        recommendations: [],
        description: row.classification_description.trim() || undefined,
        automation_rationale: row.classification_automation_rationale.trim() || undefined,
        preferred_signals: [],
        excluded_signals: [],
      })
      continue
    }
  }

  for (const [rowIndex, row] of rows.entries()) {
    const rowType = row.row_type.trim()

    if (rowType === 'recommendation') {
      const classification = classificationMap.get(row.classification_key.trim())
      if (!classification) {
        errors.push(`Row ${rowIndex + 2} references unknown classification "${row.classification_key.trim()}".`)
        continue
      }
      if (row.recommendation_text.trim()) classification.recommendations.push(row.recommendation_text.trim())
      continue
    }

    if (rowType === 'signal') {
      const classification = classificationMap.get(row.classification_key.trim())
      if (!classification) {
        errors.push(`Row ${rowIndex + 2} references unknown classification "${row.classification_key.trim()}".`)
        continue
      }
      const dimensionKey = row.signal_dimension.trim()
      if (!currentDimensionMap.has(dimensionKey)) {
        errors.push(`Row ${rowIndex + 2} references unknown competency "${dimensionKey}".`)
        continue
      }
      const state = dimensionStates.get(dimensionKey)
      const bandKey = row.signal_band_key.trim()
      if (!bandKey || !state?.bands.some((band) => band.key === bandKey)) {
        errors.push(`Row ${rowIndex + 2} references unknown band "${bandKey}" for "${dimensionKey}".`)
        continue
      }
      if (row.signal_mode === 'preferred') {
        classification.preferred_signals?.push({
          dimension: dimensionKey,
          band_key: bandKey,
          weight: Math.max(0.1, Number(row.signal_weight || 1) || 1),
        })
      } else if (row.signal_mode === 'excluded') {
        classification.excluded_signals?.push({
          dimension: dimensionKey,
          band_key: bandKey,
        })
      } else {
        errors.push(`Row ${rowIndex + 2} has an invalid signal_mode "${row.signal_mode}".`)
      }
      continue
    }

    if (rowType === 'matrix') {
      const matrixClassificationKey = row.matrix_classification_key.trim()
      const decoded = decodeCombination(current.dimensions, row.matrix_combination.trim())
      if (decoded.errors.length > 0) {
        errors.push(...decoded.errors.map((message) => `Row ${rowIndex + 2}: ${message}`))
        continue
      }
      if (!decoded.combination) continue

      for (const dimension of current.dimensions) {
        const state = dimensionStates.get(dimension.key)
        const bandKey = decoded.combination[dimension.key]
        if (bandKey !== '*' && !state?.bands.some((band) => band.key === bandKey)) {
          errors.push(`Row ${rowIndex + 2} references unknown band "${bandKey}" for "${dimension.key}".`)
        }
      }

      if (!matrixClassificationKey) continue
      if (!classificationMap.has(matrixClassificationKey)) {
        errors.push(`Row ${rowIndex + 2} references unknown classification "${matrixClassificationKey}".`)
        continue
      }

      const nextCell = {
        combination: decoded.combination,
        classification_key: matrixClassificationKey,
        source: row.matrix_source.trim() === 'generated' ? 'generated' : 'manual',
        rationale: splitList(row.matrix_rationale),
      } satisfies ScoringMatrixCell

      if (nextCell.source === 'generated') {
        matrixRows.push(nextCell)
      } else if (Object.values(nextCell.combination).includes('*')) {
        errors.push(`Row ${rowIndex + 2} cannot use "*" in a manual override combination.`)
      } else {
        overrideRows.push({ ...nextCell, source: 'manual' })
      }
      continue
    }

    if (!['scale', 'dimension', 'band', 'classification'].includes(rowType)) {
      errors.push(`Row ${rowIndex + 2} has an unknown row_type "${rowType}".`)
    }
  }

  if (errors.length > 0) return { config: null, errors }

  const scalePoints =
    Number(rows.find((row) => row.row_type === 'scale')?.scale_points) || current.scale_config?.points || 5
  const nextDimensions = current.dimensions.map((dimension) => {
    const state = dimensionStates.get(dimension.key)
    return {
      key: dimension.key,
      label: state?.label ?? dimension.label,
      description: state?.description,
      question_keys: state?.question_keys ?? [...dimension.question_keys],
      bands: (state?.bands ?? []).map((band) => ({ ...band })),
    }
  })

  return {
    config: normalizeScoringConfig({
      version: 2,
      scale_config: {
        points: scalePoints,
        labels: Array.from({ length: scalePoints }, (_, index) => scaleLabels.get(index + 1) ?? current.scale_config?.labels[index] ?? `Option ${index + 1}`),
      },
      dimensions: nextDimensions,
      classifications: Array.from(classificationMap.values()).map((classification) => copyClassification(classification)),
      classification_overrides: overrideRows,
      classification_matrix: matrixRows,
    }),
    errors: [],
  }
}
