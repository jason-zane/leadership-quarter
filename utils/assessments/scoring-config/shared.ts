import type { ScaleConfig, ScoringCondition } from '@/utils/assessments/types'

export type ActiveQuestion = {
  dimension: string
  is_active?: boolean
}

const SCALE_POINTS = new Set([2, 3, 4, 5, 6, 7])

export const MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS = 500
export const MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS = 250

export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
  points: 5,
  labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function toKey(value: string, fallback: string) {
  const key = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return key || fallback
}

export function toNumber(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

export function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

export function evaluateScoringCondition(score: number, condition: ScoringCondition) {
  if (condition.operator === '>') return score > condition.value
  if (condition.operator === '>=') return score >= condition.value
  if (condition.operator === '<') return score < condition.value
  if (condition.operator === '<=') return score <= condition.value
  if (condition.operator === '=') return score === condition.value
  if (condition.operator === '!=') return score !== condition.value
  return false
}

export function normalizeScalePoints(value: unknown): ScaleConfig['points'] {
  return SCALE_POINTS.has(Number(value))
    ? (Number(value) as ScaleConfig['points'])
    : DEFAULT_SCALE_CONFIG.points
}
