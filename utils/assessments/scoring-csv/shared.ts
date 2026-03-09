import type {
  ScoringClassification,
  ScoringDimension,
} from '@/utils/assessments/types'

export const CSV_HEADERS = [
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

export type CsvHeader = (typeof CSV_HEADERS)[number]
export type CsvRow = Record<CsvHeader, string>

export function csvEscape(value: unknown) {
  const text = String(value ?? '')
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

export function createEmptyRow(): CsvRow {
  return Object.fromEntries(CSV_HEADERS.map((header) => [header, ''])) as CsvRow
}

export function parseCsvTable(text: string): string[][] {
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
      if (currentRow.some((field) => field.trim())) rows.push(currentRow)
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

export function encodeCombination(
  dimensions: ScoringDimension[],
  combination: Record<string, string>
) {
  return dimensions
    .map((dimension) => `${dimension.key}=${combination[dimension.key] ?? ''}`)
    .join('|')
}

export function decodeCombination(
  dimensions: ScoringDimension[],
  value: string
): { combination: Record<string, string> | null; errors: string[] } {
  const errors: string[] = []
  const combination = Object.fromEntries(
    dimensions.map((dimension) => [dimension.key, ''])
  ) as Record<string, string>
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

export function splitList(value: string) {
  return value
    .split(' || ')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function copyClassification(
  classification: ScoringClassification
): ScoringClassification {
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
