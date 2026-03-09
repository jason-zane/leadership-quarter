import type {
  ScoringClassification,
  ScoringConfig,
  ScoringDimension,
} from '@/utils/assessments/types'
import { evaluateScoringCondition } from '@/utils/assessments/scoring-config/shared'
import {
  getDimensionBands,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config/normalize'
import {
  findClassificationOverride,
} from '@/utils/assessments/scoring-config/matrix/lookups'

function combinationsMatch(
  dimensions: ScoringDimension[],
  candidate: Record<string, string>,
  combination: Record<string, string>
) {
  return dimensions.every((dimension) => {
    const candidateBandKey = candidate[dimension.key]
    if (!candidateBandKey || candidateBandKey === '*') return true
    return candidateBandKey === combination[dimension.key]
  })
}

function findBestMatchingGeneratedCell(
  config: ScoringConfig,
  combination: Record<string, string>
) {
  const normalized = normalizeScoringConfig(config)

  return (
    normalized.classification_matrix ?? []
  )
    .filter((cell) =>
      combinationsMatch(normalized.dimensions, cell.combination, combination)
    )
    .sort((left, right) => {
      const leftWildcards = Object.values(left.combination).filter(
        (value) => value === '*'
      ).length
      const rightWildcards = Object.values(right.combination).filter(
        (value) => value === '*'
      ).length
      return leftWildcards - rightWildcards
    })[0] ?? null
}

function getBandLabel(config: ScoringConfig, dimensionKey: string, bandKey: string) {
  const dimension = config.dimensions.find((item) => item.key === dimensionKey)
  if (!dimension) return bandKey
  const band = getDimensionBands(config, dimension).find((item) => item.key === bandKey)
  return band?.label ?? bandKey
}

export function getClassificationLogicSummary(classification: ScoringClassification) {
  const hasConditions = classification.conditions.length > 0
  const preferredSignals = classification.preferred_signals ?? []
  const excludedSignals = classification.excluded_signals ?? []
  const hasSignalLogic = preferredSignals.length > 0 || excludedSignals.length > 0
  const isPassiveDefault = !hasConditions && !hasSignalLogic

  return { hasConditions, preferredSignals, excludedSignals, isPassiveDefault }
}

export type ClassificationResolution =
  | {
      status: 'matched'
      classification: ScoringClassification
      classification_key: string
      source: 'override' | 'rules' | 'matrix'
      rationale: string[]
    }
  | { status: 'ambiguous'; rationale: string[] }
  | { status: 'no_match'; rationale: string[] }

export function resolveClassificationCombination(
  config: ScoringConfig,
  combination: Record<string, string>,
  scores?: Record<string, number>
): ClassificationResolution {
  const normalized = normalizeScoringConfig(config)
  const exactOverride = findClassificationOverride(normalized, combination)

  if (exactOverride) {
    const classification = normalized.classifications.find(
      (item) => item.key === exactOverride.classification_key
    )
    if (classification) {
      return {
        status: 'matched',
        classification,
        classification_key: classification.key,
        source: 'override',
        rationale: ['Matched an exact manual override.'],
      }
    }
  }

  const conditionCandidates: Array<{
    classification: ScoringClassification
    rationale: string[]
  }> = []
  const signalCandidates: Array<{
    classification: ScoringClassification
    score: number
    rationale: string[]
  }> = []
  const defaultCandidates: ScoringClassification[] = []

  for (const classification of normalized.classifications) {
    const summary = getClassificationLogicSummary(classification)
    const rationale: string[] = []
    let blocked = false

    for (const exclusion of summary.excludedSignals) {
      if (combination[exclusion.dimension] !== exclusion.band_key) continue
      blocked = true
      break
    }
    if (blocked) continue

    if (summary.hasConditions && scores) {
      const matchedAll = classification.conditions.every((condition) =>
        evaluateScoringCondition(Number(scores[condition.dimension] ?? 0), condition)
      )
      if (matchedAll) {
        conditionCandidates.push({
          classification,
          rationale: ['Matched the legacy score conditions.'],
        })
      }
      continue
    }

    let signalScore = 0
    for (const signal of summary.preferredSignals) {
      if (combination[signal.dimension] !== signal.band_key) continue
      signalScore += signal.weight
      rationale.push(
        `Matched ${signal.dimension} = ${getBandLabel(
          normalized,
          signal.dimension,
          signal.band_key
        )} (+${signal.weight}).`
      )
    }

    if (signalScore > 0) {
      if (classification.automation_rationale) {
        rationale.push(classification.automation_rationale)
      }
      signalCandidates.push({
        classification,
        score: signalScore,
        rationale,
      })
      continue
    }

    if (summary.isPassiveDefault) {
      defaultCandidates.push(classification)
    }
  }

  if (conditionCandidates.length === 1) {
    const match = conditionCandidates[0]
    return {
      status: 'matched',
      classification: match.classification,
      classification_key: match.classification.key,
      source: 'rules',
      rationale: match.rationale,
    }
  }

  if (conditionCandidates.length > 1) {
    return {
      status: 'ambiguous',
      rationale: ['Multiple classifications matched the legacy score conditions.'],
    }
  }

  const sortedSignalCandidates = signalCandidates.sort(
    (left, right) => right.score - left.score
  )
  if (
    sortedSignalCandidates.length > 1 &&
    sortedSignalCandidates[0].score === sortedSignalCandidates[1].score
  ) {
    return {
      status: 'ambiguous',
      rationale: ['Multiple classifications matched the same weighted score.'],
    }
  }

  if (sortedSignalCandidates.length > 0) {
    const winner = sortedSignalCandidates[0]
    return {
      status: 'matched',
      classification: winner.classification,
      classification_key: winner.classification.key,
      source: 'rules',
      rationale: [
        `Matched ${winner.classification.label} via classification signals.`,
        ...winner.rationale,
      ],
    }
  }

  if (defaultCandidates.length === 1) {
    const classification = defaultCandidates[0]
    return {
      status: 'matched',
      classification,
      classification_key: classification.key,
      source: 'rules',
      rationale: ['Used the default fallback classification.'],
    }
  }

  if (defaultCandidates.length > 1) {
    return {
      status: 'ambiguous',
      rationale: ['Multiple classifications are configured as defaults.'],
    }
  }

  const generatedMatch = findBestMatchingGeneratedCell(normalized, combination)
  if (generatedMatch) {
    const classification = normalized.classifications.find(
      (item) => item.key === generatedMatch.classification_key
    )
    if (classification) {
      return {
        status: 'matched',
        classification,
        classification_key: classification.key,
        source: 'matrix',
        rationale: generatedMatch.rationale ?? ['Matched the generated matrix preview.'],
      }
    }
  }

  return {
    status: 'no_match',
    rationale: ['No classification rules matched this competency profile.'],
  }
}
