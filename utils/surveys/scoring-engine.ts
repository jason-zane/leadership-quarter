import type {
  ScoringClassification,
  ScoringCondition,
  ScoringConfig,
  ScoringDimension,
} from '@/utils/surveys/types'

export type NumericResponseMap = Record<string, number>

export type ScoreMap = Record<string, number>

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
  return scoringConfig.dimensions.reduce((acc, dimension) => {
    acc[dimension.key] = scoreDimension(responses, dimension)
    return acc
  }, {} as ScoreMap)
}

export function classifyResult(scores: ScoreMap, scoringConfig: ScoringConfig): ScoringClassification | null {
  for (const classification of scoringConfig.classifications) {
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
  return scoringConfig.dimensions.reduce((acc, dimension) => {
    const score = Number(scores[dimension.key] ?? 0)
    acc[dimension.key] =
      score >= dimension.thresholds.high
        ? dimension.bands.high
        : score >= dimension.thresholds.mid
          ? dimension.bands.mid
          : dimension.bands.low
    return acc
  }, {} as Record<string, string>)
}
