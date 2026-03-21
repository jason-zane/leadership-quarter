import { buildScaleItemValueMap, buildScaleMatrix, countScaleItemMissing } from '@/utils/assessments/psychometric-structure'
import type { QuestionBank } from '@/utils/assessments/assessment-question-bank'
import type { ScoringConfig } from '@/utils/assessments/assessment-scoring'
import {
  alphaIfItemDeleted,
  ceilingFloorEffect,
  correctedItemTotalR,
  cronbachAlpha,
  cronbachAlphaCI95,
  mean,
  sampleSD,
  standardErrorOfMeasurement,
} from '@/utils/stats/engine'

export type PsychometricScaleItem = {
  questionKey: string
  text: string
  weight: number
  reverseScored: boolean
  sortOrder: number
}

export type PsychometricScale = {
  key: string
  label: string
  competencyKeys: string[]
  itemCount: number
  items: PsychometricScaleItem[]
}

export type PsychometricStructureWarning = {
  code: 'trait_has_too_few_items' | 'trait_missing_name'
  message: string
  scaleKey?: string
}

export type PsychometricStructure = {
  primaryScales: PsychometricScale[]
  warnings: PsychometricStructureWarning[]
  scalePoints: number
}

export type PsychometricScaleDiagnostic = {
  scaleKey: string
  scaleLabel: string
  itemCount: number
  alpha: number | null
  alphaCI95: { lower: number; upper: number } | null
  sem: number | null
  n: number
  signal: 'green' | 'amber' | 'red' | 'insufficient_data'
}

export type PsychometricItemDiagnostic = {
  questionKey: string
  text: string
  scaleKey: string
  scaleLabel: string
  reverseScored: boolean
  mean: number
  sd: number | null
  citc: number | null
  alphaIfDeleted: number | null
  discriminationIndex: number | null
  missingPct: number
  ceilingPct: number
  floorPct: number
  healthSignal: 'green' | 'amber' | 'red'
}

export type TraitNormStat = {
  traitKey: string
  traitLabel: string
  n: number
  mean: number
  sd: number | null
  min: number | null
  max: number | null
  p10: number | null
  p25: number | null
  p50: number | null
  p75: number | null
  p90: number | null
  alpha: number | null
}

function toLegacyCompatibleScaleItems(items: PsychometricScaleItem[]) {
  return items.map((item) => ({
    questionId: item.questionKey,
    questionKey: item.questionKey,
    text: item.text,
    weight: item.weight,
    reverseScored: item.reverseScored,
    legacyDimension: null,
    sortOrder: item.sortOrder,
  }))
}

function percentileLinear(values: number[], percentile: number): number | null {
  if (values.length === 0) return null
  if (values.length === 1) return values[0] ?? null
  const position = (percentile / 100) * (values.length - 1)
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.ceil(position)
  if (lowerIndex === upperIndex) return values[lowerIndex] ?? null
  const lower = values[lowerIndex] ?? 0
  const upper = values[upperIndex] ?? 0
  const weight = position - lowerIndex
  return lower + ((upper - lower) * weight)
}

function reverseLikert(value: number, scalePoints: number) {
  return (scalePoints + 1) - value
}

function scoreMethodForTrait(scoringConfig: ScoringConfig, traitKey: string) {
  return scoringConfig.calculation.traitOverrides.find((item) => item.targetKey === traitKey)?.method
    ?? scoringConfig.calculation.traitDefaultMethod
}

function itemHealthSignal(input: {
  citc: number | null
  missingPct: number
  ceilingPct: number
  floorPct: number
}): 'green' | 'amber' | 'red' {
  if (input.citc !== null && input.citc < 0.2) return 'red'
  if (input.missingPct >= 0.15) return 'red'
  if (input.citc !== null && input.citc < 0.3) return 'amber'
  if (input.missingPct >= 0.05) return 'amber'
  if (input.ceilingPct >= 0.5 || input.floorPct >= 0.5) return 'amber'
  return 'green'
}

function computeDiscriminationIndex(matrix: number[][] | null, itemIndex: number): number | null {
  if (!matrix || !matrix[0] || matrix[0].length < 6) return null

  const nRespondents = matrix[0].length
  const totalScores = Array.from({ length: nRespondents }, (_, respondentIndex) =>
    matrix.reduce((sum, itemScores) => sum + (itemScores[respondentIndex] ?? 0), 0)
  )
  const sortedIndexes = Array.from({ length: nRespondents }, (_, index) => index)
    .sort((a, b) => totalScores[a]! - totalScores[b]!)

  const groupSize = Math.max(1, Math.floor(nRespondents * 0.27))
  const lowerIndexes = sortedIndexes.slice(0, groupSize)
  const upperIndexes = sortedIndexes.slice(-groupSize)
  const itemScores = matrix[itemIndex]
  if (!itemScores) return null

  const lowerMean = mean(lowerIndexes.map((index) => itemScores[index] ?? 0))
  const upperMean = mean(upperIndexes.map((index) => itemScores[index] ?? 0))
  return Math.round((upperMean - lowerMean) * 1000) / 1000
}

export function buildPsychometricStructure(
  questionBank: QuestionBank
): PsychometricStructure {
  const warnings: PsychometricStructureWarning[] = []

  const primaryScales = questionBank.traits.map((trait) => {
    const items = questionBank.scoredItems
      .filter((item) => item.traitKey === trait.key)
      .map((item, index) => ({
        questionKey: item.key,
        text: item.text,
        weight: item.weight,
        reverseScored: item.isReverseCoded,
        sortOrder: index,
      }))

    if (!(trait.internalName || trait.externalName)) {
      warnings.push({
        code: 'trait_missing_name',
        message: `Trait ${trait.key} is missing a display name.`,
        scaleKey: trait.key,
      })
    }

    if (items.length > 0 && items.length < 2) {
      warnings.push({
        code: 'trait_has_too_few_items',
        message: `Trait ${trait.internalName || trait.key} has fewer than two items.`,
        scaleKey: trait.key,
      })
    }

    return {
      key: trait.key,
      label: trait.internalName || trait.externalName || trait.key,
      competencyKeys: trait.competencyKeys,
      itemCount: items.length,
      items,
    } satisfies PsychometricScale
  }).filter((scale) => scale.items.length > 0)

  return {
    primaryScales,
    warnings,
    scalePoints: questionBank.scale.points,
  }
}

export function computeTraitScore(
  scale: PsychometricScale,
  responses: Record<string, number>,
  questionBank: QuestionBank,
  scoringConfig: ScoringConfig
) {
  const method = scoreMethodForTrait(scoringConfig, scale.key)
  const useItemWeights = scoringConfig.calculation.useItemWeights

  const keyedValues = scale.items.map((item) => {
    const raw = responses[item.questionKey]
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
    return item.reverseScored ? reverseLikert(raw, questionBank.scale.points) : raw
  })

  if (keyedValues.some((value) => value === null)) return null

  const resolved = keyedValues as number[]
  const weights = scale.items.map((item) => useItemWeights ? item.weight : 1)
  const weightedSum = resolved.reduce((sum, value, index) => sum + (value * (weights[index] ?? 1)), 0)

  if (method === 'sum') {
    return Number(weightedSum.toFixed(4))
  }

  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  if (totalWeight <= 0) return null
  return Number((weightedSum / totalWeight).toFixed(4))
}

export function computeTraitNormStats(input: {
  structure: PsychometricStructure
  questionBank: QuestionBank
  scoringConfig: ScoringConfig
  responseMaps: Array<Record<string, number>>
}) {
  const { structure, questionBank, scoringConfig, responseMaps } = input

  return structure.primaryScales.map((scale) => {
    const values = responseMaps
      .map((responses) => computeTraitScore(scale, responses, questionBank, scoringConfig))
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b)

    const matrix = buildScaleMatrix(
      { items: toLegacyCompatibleScaleItems(scale.items) },
      responseMaps
    )
    const alpha = matrix ? cronbachAlpha(matrix) : null

    return {
      traitKey: scale.key,
      traitLabel: scale.label,
      n: values.length,
      mean: values.length > 0 ? Number(mean(values).toFixed(4)) : 0,
      sd: values.length > 1 ? Number((sampleSD(values) ?? 0).toFixed(4)) : null,
      min: values[0] ?? null,
      max: values[values.length - 1] ?? null,
      p10: percentileLinear(values, 10),
      p25: percentileLinear(values, 25),
      p50: percentileLinear(values, 50),
      p75: percentileLinear(values, 75),
      p90: percentileLinear(values, 90),
      alpha: alpha !== null ? Number(alpha.toFixed(4)) : null,
    } satisfies TraitNormStat
  })
}

export function computeDiagnostics(input: {
  structure: PsychometricStructure
  responseMaps: Array<Record<string, number>>
}) {
  const scaleDiagnostics: PsychometricScaleDiagnostic[] = []
  const itemDiagnostics: PsychometricItemDiagnostic[] = []

  for (const scale of input.structure.primaryScales) {
    const matrix = buildScaleMatrix(
      { items: toLegacyCompatibleScaleItems(scale.items) },
      input.responseMaps
    )
    const completeN = matrix?.[0]?.length ?? 0
    const alpha = matrix ? cronbachAlpha(matrix) : null
    const compositeScores = matrix?.[0]
      ? Array.from({ length: completeN }, (_, respondentIndex) =>
          scale.items.reduce((sum, _item, itemIndex) => sum + (matrix[itemIndex]?.[respondentIndex] ?? 0), 0)
        )
      : null
    const compositeSD = compositeScores ? sampleSD(compositeScores) : null
    const signal =
      alpha === null
        ? 'insufficient_data'
        : alpha >= 0.7
          ? 'green'
          : alpha >= 0.6
            ? 'amber'
            : 'red'

    scaleDiagnostics.push({
      scaleKey: scale.key,
      scaleLabel: scale.label,
      itemCount: scale.items.length,
      alpha: alpha !== null ? Number(alpha.toFixed(3)) : null,
      alphaCI95: alpha !== null && completeN > 1
        ? cronbachAlphaCI95(alpha, scale.items.length, completeN)
        : null,
      sem: alpha !== null && compositeSD !== null
        ? Number(standardErrorOfMeasurement(compositeSD, alpha).toFixed(3))
        : null,
      n: completeN,
      signal,
    })

    const valuesByQuestion = buildScaleItemValueMap(
      { items: toLegacyCompatibleScaleItems(scale.items) },
      input.responseMaps
    )
    const missingByQuestion = countScaleItemMissing(
      { items: toLegacyCompatibleScaleItems(scale.items) },
      input.responseMaps
    )

    for (let itemIndex = 0; itemIndex < scale.items.length; itemIndex += 1) {
      const item = scale.items[itemIndex]!
      const keyedValues = valuesByQuestion.get(item.questionKey) ?? []
      const keyedMean = keyedValues.length > 0 ? mean(keyedValues) : 0
      const keyedSd = keyedValues.length > 1 ? sampleSD(keyedValues) : null
      const missingPct = input.responseMaps.length > 0
        ? (missingByQuestion.get(item.questionKey) ?? 0) / input.responseMaps.length
        : 0
      const { ceilingPct, floorPct } = ceilingFloorEffect(keyedValues, 1, input.structure.scalePoints)
      const citc = matrix ? correctedItemTotalR(itemIndex, matrix) : null
      const alphaIfDeleted = matrix ? alphaIfItemDeleted(itemIndex, matrix) : null
      const discriminationIndex = computeDiscriminationIndex(matrix, itemIndex)

      itemDiagnostics.push({
        questionKey: item.questionKey,
        text: item.text,
        scaleKey: scale.key,
        scaleLabel: scale.label,
        reverseScored: item.reverseScored,
        mean: Number(keyedMean.toFixed(3)),
        sd: keyedSd !== null ? Number(keyedSd.toFixed(3)) : null,
        citc: citc !== null ? Number(citc.toFixed(3)) : null,
        alphaIfDeleted: alphaIfDeleted !== null ? Number(alphaIfDeleted.toFixed(3)) : null,
        discriminationIndex,
        missingPct: Number(missingPct.toFixed(3)),
        ceilingPct: Number(ceilingPct.toFixed(3)),
        floorPct: Number(floorPct.toFixed(3)),
        healthSignal: itemHealthSignal({
          citc,
          missingPct,
          ceilingPct,
          floorPct,
        }),
      })
    }
  }

  return { scaleDiagnostics, itemDiagnostics }
}
