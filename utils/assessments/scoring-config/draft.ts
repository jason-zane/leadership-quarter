import type {
  ScoringClassification,
  ScoringConfig,
  ScoringMatrixCell,
} from '@/utils/assessments/types'
import {
  MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS,
  evaluateScoringCondition,
  roundToSingleDecimal,
} from '@/utils/assessments/scoring-config/shared'
import {
  getDimensionBands,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config/normalize'
import {
  buildClassificationCombinations,
  buildCombinationPage,
  getClassificationCombinationCount,
  getDecisionDimensionKeys,
  makeCombinationSignature,
} from '@/utils/assessments/scoring-config/matrix'

function classifyLegacyScores(
  scores: Record<string, number>,
  classifications: ScoringClassification[]
) {
  for (const classification of classifications) {
    if (classification.conditions.length === 0) return classification
    const matches = classification.conditions.every((condition) =>
      evaluateScoringCondition(Number(scores[condition.dimension] ?? 0), condition)
    )
    if (matches) return classification
  }
  return null
}

export function upgradeScoringConfigToV2(config: ScoringConfig): ScoringConfig {
  const normalized = normalizeScoringConfig(config)
  if (normalized.version === 2) return normalized

  const matrix = buildClassificationCombinations({
    ...normalized,
    version: 2,
    classification_matrix: [],
  }).flatMap((combination) => {
    const scores = Object.fromEntries(
      normalized.dimensions.map((dimension) => {
        const bandKey = combination[dimension.key]
        const band = getDimensionBands(normalized, dimension).find((item) => item.key === bandKey)
        const midpoint = band
          ? roundToSingleDecimal((band.min_score + (band.max_score ?? band.min_score)) / 2)
          : 0
        return [dimension.key, midpoint]
      })
    )
    const classification = classifyLegacyScores(scores, normalized.classifications)
    if (!classification) return []
    return [
      {
        combination,
        classification_key: classification.key,
        source: 'manual' as const,
      },
    ]
  })

  return {
    ...normalized,
    version: 2,
    classification_overrides: matrix,
    classification_matrix: [],
  }
}

type CombinationDraftResult =
  | { status: 'assigned'; cell: ScoringMatrixCell }
  | { status: 'ambiguous' }
  | { status: 'no_match' }

export type MatrixDraftGenerationSummary = {
  assigned: number
  left_blank: number
  changed: number
  ambiguous: number
  no_match: number
}

export type MatrixDraftGenerationResult = {
  config: ScoringConfig
  summary: MatrixDraftGenerationSummary
}

function getBandLabel(config: ScoringConfig, dimensionKey: string, bandKey: string) {
  const dimension = config.dimensions.find((item) => item.key === dimensionKey)
  if (!dimension) return bandKey
  const band = getDimensionBands(config, dimension).find((item) => item.key === bandKey)
  return band?.label ?? bandKey
}

function scoreCombinationForClassification(
  config: ScoringConfig,
  combination: Record<string, string>,
  classification: ScoringClassification
): { score: number; rationale: string[]; blocked: boolean } {
  const rationale: string[] = []

  for (const exclusion of classification.excluded_signals ?? []) {
    if (combination[exclusion.dimension] !== exclusion.band_key) continue
    return {
      score: 0,
      blocked: true,
      rationale: [
        `Excluded because ${exclusion.dimension} is ${getBandLabel(
          config,
          exclusion.dimension,
          exclusion.band_key
        )}.`,
      ],
    }
  }

  let score = 0
  for (const signal of classification.preferred_signals ?? []) {
    if (combination[signal.dimension] !== signal.band_key) continue
    score += signal.weight
    rationale.push(
      `Matched ${signal.dimension} = ${getBandLabel(config, signal.dimension, signal.band_key)} (+${signal.weight}).`
    )
  }

  if (classification.automation_rationale) rationale.push(classification.automation_rationale)

  return { score, rationale, blocked: false }
}

function generateDraftCellForCombination(
  config: ScoringConfig,
  combination: Record<string, string>
): CombinationDraftResult {
  const matches = config.classifications
    .map((classification) => {
      const evaluation = scoreCombinationForClassification(config, combination, classification)
      return { classification, ...evaluation }
    })
    .filter((candidate) => !candidate.blocked && candidate.score > 0)
    .sort((left, right) => right.score - left.score)

  if (matches.length === 0) return { status: 'no_match' }
  if (matches.length > 1 && matches[0].score === matches[1].score) {
    return { status: 'ambiguous' }
  }

  const winner = matches[0]
  return {
    status: 'assigned',
    cell: {
      combination,
      classification_key: winner.classification.key,
      source: 'generated',
      rationale: [`Auto-matched to ${winner.classification.label}.`, ...winner.rationale],
    },
  }
}

export function clearGeneratedClassificationMatrixCells(config: ScoringConfig): ScoringConfig {
  const normalized = normalizeScoringConfig(config)
  return {
    ...normalized,
    classification_matrix: [],
  }
}

export function generateDraftClassificationMatrix(
  config: ScoringConfig,
  options: { filters?: Record<string, string> } = {}
): MatrixDraftGenerationResult {
  const normalized = normalizeScoringConfig(config)
  const exactCombinationCount = getClassificationCombinationCount(normalized, {
    filters: options.filters,
  })
  const decisionDimensionKeys = Array.from(
    new Set([
      ...getDecisionDimensionKeys(normalized),
      ...Object.entries(options.filters ?? {})
        .filter(([, bandKey]) => !!bandKey)
        .map(([dimensionKey]) => dimensionKey),
    ])
  )
  const previewPage =
    exactCombinationCount <= MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS
      ? buildCombinationPage(normalized, {
          filters: options.filters,
          limit: exactCombinationCount,
        })
      : buildCombinationPage(normalized, {
          dimensionKeys: decisionDimensionKeys,
          filters: options.filters,
          wildcardOtherDimensions: true,
          limit: MAX_EXACT_MATRIX_PREVIEW_COMBINATIONS,
        })
  const combinations = previewPage.rows
  const previousGeneratedBySignature = new Map(
    (normalized.classification_matrix ?? [])
      .filter((cell) => cell.source === 'generated')
      .map((cell) => [makeCombinationSignature(normalized.dimensions, cell.combination), cell])
  )
  const overrideSignatures = new Set(
    (normalized.classification_overrides ?? []).map((cell) =>
      makeCombinationSignature(normalized.dimensions, cell.combination)
    )
  )

  const generatedCells: ScoringMatrixCell[] = []
  let ambiguous = 0
  let noMatch = 0
  let changed = 0

  for (const combination of combinations) {
    const signature = makeCombinationSignature(normalized.dimensions, combination)
    if (overrideSignatures.has(signature)) continue

    const draft = generateDraftCellForCombination(normalized, combination)
    if (draft.status === 'ambiguous') {
      ambiguous += 1
      if (previousGeneratedBySignature.has(signature)) changed += 1
      continue
    }
    if (draft.status === 'no_match') {
      noMatch += 1
      if (previousGeneratedBySignature.has(signature)) changed += 1
      continue
    }

    const previous = previousGeneratedBySignature.get(signature)
    if (
      !previous ||
      previous.classification_key !== draft.cell.classification_key ||
      JSON.stringify(previous.rationale ?? []) !== JSON.stringify(draft.cell.rationale ?? [])
    ) {
      changed += 1
    }
    generatedCells.push(draft.cell)
  }

  return {
    config: {
      ...normalized,
      classification_matrix: generatedCells,
    },
    summary: {
      assigned: generatedCells.length,
      left_blank: Math.max(0, combinations.length - generatedCells.length),
      changed,
      ambiguous,
      no_match: noMatch,
    },
  }
}
