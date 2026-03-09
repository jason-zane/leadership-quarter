import type { ScoringDimension } from '@/utils/assessments/types'

export type Question = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
  is_active: boolean
}

export type CsvRow = {
  construct_key: string
  construct_label: string
  item_text: string
  reverse_coded: boolean
}

export type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

export type AddToast = (message: string, type: Toast['type']) => void

export type CreateQuestionInput = {
  questionKey: string
  text: string
  dimension: string
  isReverseCoded: boolean
}

export function toKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export function getNextQuestionKey(dimensionKey: string, questions: Question[]) {
  const existing = questions.filter((question) => question.dimension === dimensionKey)
  return `${dimensionKey}_${existing.length + 1}`
}

export function downloadQuestionsCsvTemplate() {
  const content = [
    'construct_key,construct_label,item_text,reverse_coded',
    'openness,Openness to AI,"I am comfortable using AI tools in my daily work",false',
    'openness,Openness to AI,"AI makes me feel anxious or uncertain",true',
  ].join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'assessment_import_template.csv'
  anchor.click()
  URL.revokeObjectURL(url)
}

export function parseQuestionsCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  function parseRow(line: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuotes = false

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]
      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current)
        current = ''
      } else {
        current += char
      }
    }

    fields.push(current)
    return fields
  }

  const rows: CsvRow[] = []
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line) continue

    const [constructKey, constructLabel, itemText, reverseCoded] = parseRow(line)
    if (!constructKey || !itemText) continue

    rows.push({
      construct_key: constructKey.trim(),
      construct_label: constructLabel?.trim() || constructKey.trim(),
      item_text: itemText.trim(),
      reverse_coded: String(reverseCoded).toLowerCase() === 'true',
    })
  }

  return rows
}

export function groupCsvRowsByConstruct(rows: CsvRow[]) {
  return rows.reduce<Record<string, { label: string; items: CsvRow[] }>>((acc, row) => {
    if (!acc[row.construct_key]) {
      acc[row.construct_key] = { label: row.construct_label, items: [] }
    }

    acc[row.construct_key].items.push(row)
    return acc
  }, {})
}

export function createImportedDimensions(rows: CsvRow[], dimensions: ScoringDimension[]) {
  const existingKeys = new Set(dimensions.map((dimension) => dimension.key))
  const newConstructs = [...new Map(rows.map((row) => [row.construct_key, row])).values()].filter(
    (row) => !existingKeys.has(row.construct_key)
  )

  if (newConstructs.length === 0) {
    return dimensions
  }

  return [
    ...dimensions,
    ...newConstructs.map((row) => ({
      key: row.construct_key,
      label: row.construct_label,
      question_keys: [],
      bands: [],
    })),
  ]
}

export function buildCsvImportQuestions(rows: CsvRow[], questions: Question[]): CreateQuestionInput[] {
  const dimensionCounts: Record<string, number> = {}
  for (const question of questions) {
    dimensionCounts[question.dimension] = (dimensionCounts[question.dimension] ?? 0) + 1
  }

  return rows.map((row) => {
    const count = (dimensionCounts[row.construct_key] ?? 0) + 1
    dimensionCounts[row.construct_key] = count

    return {
      questionKey: `${row.construct_key}_${count}`,
      text: row.item_text,
      dimension: row.construct_key,
      isReverseCoded: row.reverse_coded,
    }
  })
}
