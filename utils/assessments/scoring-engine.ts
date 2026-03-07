import type {
  ScoringBand,
  ScoringClassification,
  ScoringCondition,
  ScoringConfig,
  ScoringDimension,
} from '@/utils/assessments/types'
import { getBandByScore, normalizeScoringConfig, resolveClassificationCombination } from '@/utils/assessments/scoring-config'

export type NumericResponseMap = Record<string, number>

export type ScoreMap = Record<string, number>

// Legacy DB shape — bands was {high, mid, low} before the ScoringBand[] migration
type LegacyDimension = ScoringDimension & {
  thresholds: { high: number; mid: number }
  bands: { high: string; mid: string; low: string }
}

function resolvedBands(dim: ScoringDimension): ScoringBand[] {
  if (Array.isArray(dim.bands)) return dim.bands as ScoringBand[]
  const legacy = dim as unknown as LegacyDimension
  return [
    { label: legacy.bands.low, min_score: 1 },
    { label: legacy.bands.mid, min_score: legacy.thresholds.mid },
    { label: legacy.bands.high, min_score: legacy.thresholds.high },
  ]
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

function evaluateCondition(score: number, condition: ScoringCondition) {
  if (condition.operator === '>') return score > condition.value
  if (condition.operator === '>=') return score >= condition.value
  if (condition.operator === '<') return score < condition.value
  if (condition.operator === '<=') return score <= condition.value
  if (condition.operator === '=') return score === condition.value
  if (condition.operator === '!=') return score !== condition.value
  return false
}

function scoreDimension(responses: NumericResponseMap, dimension: ScoringDimension) {
  if (dimension.question_keys.length === 0) return 0

  const total = dimension.question_keys.reduce((acc, questionKey) => {
    const value = Number(responses[questionKey] ?? 0)
    return acc + value
  }, 0)

  return roundToSingleDecimal(total / dimension.question_keys.length)
}

export function computeScores(responses: NumericResponseMap, scoringConfig: ScoringConfig): ScoreMap {
  const normalized = normalizeScoringConfig(scoringConfig)
  return normalized.dimensions.reduce((acc, dimension) => {
    acc[dimension.key] = scoreDimension(responses, dimension)
    return acc
  }, {} as ScoreMap)
}

export function classifyResult(scores: ScoreMap, scoringConfig: ScoringConfig): ScoringClassification | null {
  const normalized = normalizeScoringConfig(scoringConfig)

  if (normalized.version === 2) {
    const combination = Object.fromEntries(
      normalized.dimensions.map((dimension) => {
        const band = getBandByScore(normalized, dimension, Number(scores[dimension.key] ?? 0))
        return [dimension.key, band?.key ?? '']
      })
    )
    const resolution = resolveClassificationCombination(normalized, combination, scores)
    if (resolution.status !== 'matched') return null
    return resolution.classification
  }

  for (const classification of normalized.classifications) {
    if (classification.conditions.length === 0) {
      return classification
    }

    const matchedAll = classification.conditions.every((condition) => {
      const score = Number(scores[condition.dimension] ?? 0)
      return evaluateCondition(score, condition)
    })

    if (matchedAll) {
      return classification
    }
  }

  return null
}

export function getBands(scores: ScoreMap, scoringConfig: ScoringConfig): Record<string, string> {
  const normalized = normalizeScoringConfig(scoringConfig)
  return normalized.dimensions.reduce((acc, dim) => {
    const score = Number(scores[dim.key] ?? 0)
    const matched = getBandByScore(normalized, dim, score)
    const sorted = [...resolvedBands(dim)].sort((a, b) => b.min_score - a.min_score)
    acc[dim.key] = matched?.label ?? sorted.find((b) => score >= b.min_score)?.label ?? sorted.at(-1)?.label ?? ''
    return acc
  }, {} as Record<string, string>)
}
