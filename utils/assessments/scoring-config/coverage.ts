import type {
  ScoringConfig,
  ScoringCoverageIssue,
  ScoringCoverageReport,
} from '@/utils/assessments/types'
import {
  DEFAULT_SCALE_CONFIG,
  MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS,
  type ActiveQuestion,
  roundToSingleDecimal,
} from '@/utils/assessments/scoring-config/shared'
import {
  getDimensionBands,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config/normalize'
import {
  buildClassificationCombinations,
  buildCombinationPage,
  getBandOptionsForDimension,
  getClassificationCombinationCount,
  getClassificationLogicSummary,
  getDecisionDimensionKeys,
  makeCombinationSignature,
  resolveClassificationCombination,
} from '@/utils/assessments/scoring-config/matrix'

export function analyzeScoringCoverage(config: ScoringConfig): ScoringCoverageReport {
  const normalized = normalizeScoringConfig(config)
  if (normalized.version !== 2) {
    return {
      ok: true,
      combinations_total: 0,
      combinations_mapped: 0,
      manual_combinations: 0,
      generated_combinations: 0,
      unresolved_combinations: 0,
      missing_combinations: 0,
      duplicate_combinations: 0,
      analysis_mode: 'exhaustive',
      evaluated_profiles: 0,
      issues: [],
    }
  }

  const issues: ScoringCoverageIssue[] = []
  const classificationKeys = new Set(
    normalized.classifications.map((classification) => classification.key)
  )
  const referencedClassificationKeys = new Set<string>()
  const bandKeysByDimension = new Map<string, Set<string>>()
  const totalCombinations = getClassificationCombinationCount(normalized)
  const overrideMap = new Map<string, number>()

  for (const dimension of normalized.dimensions) {
    const bands = getDimensionBands(normalized, dimension)
    const keys = new Set<string>()
    let previousMax = 0

    for (const band of bands) {
      if (!band.key) continue
      if (keys.has(band.key)) {
        issues.push({
          type: 'dimension_band_key_duplicate',
          message: `Dimension "${dimension.label}" has duplicate band key "${band.key}".`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
      }
      keys.add(band.key)

      const min = roundToSingleDecimal(band.min_score)
      const max = roundToSingleDecimal(band.max_score ?? min)
      if (min > max) {
        issues.push({
          type: 'dimension_band_invalid',
          message: `Band "${band.label}" in "${dimension.label}" has an invalid score range.`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
        continue
      }
      if (bands.indexOf(band) === 0 && min > 1) {
        issues.push({
          type: 'dimension_band_gap',
          message: `Dimension "${dimension.label}" does not cover scores below ${min}.`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
      }
      if (min > roundToSingleDecimal(previousMax + 0.1) && previousMax > 0) {
        issues.push({
          type: 'dimension_band_gap',
          message: `Dimension "${dimension.label}" has a score gap between ${previousMax} and ${min}.`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
      }
      if (min <= previousMax && previousMax > 0) {
        issues.push({
          type: 'dimension_band_overlap',
          message: `Dimension "${dimension.label}" has overlapping score ranges around "${band.label}".`,
          dimension_key: dimension.key,
          band_key: band.key,
        })
      }
      previousMax = Math.max(previousMax, max)
    }

    if (
      bands.length > 0 &&
      previousMax < (normalized.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points)
    ) {
      issues.push({
        type: 'dimension_band_gap',
        message: `Dimension "${dimension.label}" does not cover scores up to ${normalized.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points}.`,
        dimension_key: dimension.key,
      })
    }

    bandKeysByDimension.set(dimension.key, keys)
  }

  for (const cell of normalized.classification_overrides ?? []) {
    const signature = makeCombinationSignature(normalized.dimensions, cell.combination)
    overrideMap.set(signature, (overrideMap.get(signature) ?? 0) + 1)
    for (const dimension of normalized.dimensions) {
      const bandKey = cell.combination[dimension.key]
      if (!bandKey || !bandKeysByDimension.get(dimension.key)?.has(bandKey)) {
        issues.push({
          type: 'matrix_invalid_band',
          message: `A manual override references an unknown band for "${dimension.label}".`,
          dimension_key: dimension.key,
          combination: cell.combination,
        })
      }
    }

    if (!classificationKeys.has(cell.classification_key)) {
      issues.push({
        type: 'matrix_invalid_classification',
        message: `A manual override references unknown classification "${cell.classification_key}".`,
        classification_key: cell.classification_key,
        combination: cell.combination,
      })
    } else {
      referencedClassificationKeys.add(cell.classification_key)
    }
  }

  for (const cell of normalized.classification_matrix ?? []) {
    for (const dimension of normalized.dimensions) {
      const bandKey = cell.combination[dimension.key]
      if (!bandKey || bandKey === '*') continue
      if (!bandKeysByDimension.get(dimension.key)?.has(bandKey)) {
        issues.push({
          type: 'matrix_invalid_band',
          message: `A generated matrix row references an unknown band for "${dimension.label}".`,
          dimension_key: dimension.key,
          combination: cell.combination,
        })
      }
    }

    if (!classificationKeys.has(cell.classification_key)) {
      issues.push({
        type: 'matrix_invalid_classification',
        message: `A generated matrix row references unknown classification "${cell.classification_key}".`,
        classification_key: cell.classification_key,
        combination: cell.combination,
      })
    }
  }

  for (const [signature, count] of overrideMap.entries()) {
    if (count > 1) {
      const combination = Object.fromEntries(
        signature.split('|').map((item) => item.split(':'))
      ) as Record<string, string>
      issues.push({
        type: 'matrix_duplicate_combination',
        message: 'A manual override combination is defined more than once.',
        combination,
      })
    }
  }

  let mapped = 0
  let mappedManual = 0
  let mappedGenerated = 0
  let unresolved = 0
  let evaluatedProfiles = 0
  let analysisMode: ScoringCoverageReport['analysis_mode'] = 'exhaustive'

  if (totalCombinations <= MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS) {
    const combinations = buildClassificationCombinations(normalized)
    evaluatedProfiles = combinations.length

    for (const combination of combinations) {
      const resolution = resolveClassificationCombination(normalized, combination)
      if (resolution.status === 'matched') {
        mapped += 1
        if (resolution.source === 'override') mappedManual += 1
        else mappedGenerated += 1
        referencedClassificationKeys.add(resolution.classification_key)
        continue
      }

      unresolved += 1
      issues.push({
        type:
          resolution.status === 'ambiguous'
            ? 'classification_ambiguous'
            : 'classification_no_match',
        message:
          resolution.status === 'ambiguous'
            ? 'A competency-band combination resolves to multiple classifications.'
            : 'A competency-band combination does not resolve to any classification.',
        combination,
      })
    }
  } else {
    analysisMode = 'rules'
    const decisionDimensionKeys = getDecisionDimensionKeys(normalized)
    const defaultClassifications = normalized.classifications.filter(
      (classification) => getClassificationLogicSummary(classification).isPassiveDefault
    )
    const decisionProfileTotal = getClassificationCombinationCount(normalized, {
      dimensionKeys: decisionDimensionKeys,
    })
    evaluatedProfiles = Math.min(
      decisionProfileTotal,
      MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS
    )

    if (
      decisionDimensionKeys.length > 0 &&
      decisionProfileTotal <= MAX_EXHAUSTIVE_COVERAGE_COMBINATIONS
    ) {
      const profilePage = buildCombinationPage(normalized, {
        dimensionKeys: decisionDimensionKeys,
        wildcardOtherDimensions: true,
        limit: decisionProfileTotal,
      })
      const multiplier = decisionDimensionKeys.reduce((currentMultiplier, dimensionKey) => {
        return (
          currentMultiplier *
          Math.max(1, getBandOptionsForDimension(normalized, dimensionKey).length)
        )
      }, 1)
      const exactMultiplicity = Math.max(
        1,
        Math.round(totalCombinations / Math.max(1, multiplier))
      )

      for (const combination of profilePage.rows) {
        const resolution = resolveClassificationCombination(normalized, combination)
        if (resolution.status === 'matched') {
          mapped += exactMultiplicity
          if (resolution.source === 'override') mappedManual += 1
          else mappedGenerated += exactMultiplicity
          referencedClassificationKeys.add(resolution.classification_key)
          continue
        }

        unresolved += exactMultiplicity
        issues.push({
          type:
            resolution.status === 'ambiguous'
              ? 'classification_ambiguous'
              : 'classification_no_match',
          message:
            resolution.status === 'ambiguous'
              ? 'A grouped rule profile resolves to multiple classifications.'
              : 'A grouped rule profile does not resolve to any classification.',
          combination,
        })
      }
    } else if (defaultClassifications.length === 1) {
      mapped = totalCombinations
      mappedGenerated = totalCombinations
      referencedClassificationKeys.add(defaultClassifications[0].key)
    } else {
      unresolved = totalCombinations
      issues.push({
        type: 'classification_no_match',
        message:
          'This assessment is too large for exhaustive matrix coverage and needs exactly one default fallback classification to validate safely.',
      })
    }
  }

  for (const classification of normalized.classifications) {
    if (!referencedClassificationKeys.has(classification.key)) {
      issues.push({
        type: 'matrix_unreachable_classification',
        message: `Classification "${classification.label}" is not used in the matrix.`,
        classification_key: classification.key,
      })
    }
  }

  const duplicateCombinations = Array.from(overrideMap.values()).filter((count) => count > 1).length
  const missingCombinations = Math.max(0, totalCombinations - mapped)

  return {
    ok: issues.length === 0,
    combinations_total: totalCombinations,
    combinations_mapped: mapped,
    manual_combinations: mappedManual,
    generated_combinations: mappedGenerated,
    unresolved_combinations: unresolved || missingCombinations,
    missing_combinations: missingCombinations,
    duplicate_combinations: duplicateCombinations,
    analysis_mode: analysisMode,
    evaluated_profiles: evaluatedProfiles,
    issues,
  }
}

export function analyzeScoringConfig(
  config: ScoringConfig,
  questions: ActiveQuestion[]
): {
  config: ScoringConfig
  coverage: ScoringCoverageReport
  checks: Array<{ label: string; pass: boolean; message: string; blocking: boolean }>
  canPublish: boolean
} {
  const normalized = normalizeScoringConfig(config)
  const coverage = analyzeScoringCoverage(normalized)
  const dimensions = normalized.dimensions
  const classifications = normalized.classifications
  const dimensionCounts = Object.fromEntries(
    dimensions.map((dimension) => [
      dimension.key,
      questions.filter(
        (question) =>
          question.dimension === dimension.key && question.is_active !== false
      ).length,
    ])
  ) as Record<string, number>
  const dimensionsWithFewItems = dimensions.filter(
    (dimension) => (dimensionCounts[dimension.key] ?? 0) < 3
  )
  const dimensionsWithNoBands = dimensions.filter(
    (dimension) => getDimensionBands(normalized, dimension).length === 0
  )
  const hasScale = !!normalized.scale_config
  const hasClassifications = classifications.length > 0
  const hasClassificationLogic =
    classifications.some((classification) => {
      const summary = getClassificationLogicSummary(classification)
      return (
        summary.hasConditions ||
        summary.preferredSignals.length > 0 ||
        summary.excludedSignals.length > 0 ||
        summary.isPassiveDefault
      )
    }) ||
    (normalized.classification_overrides?.length ?? 0) > 0 ||
    (normalized.classification_matrix?.length ?? 0) > 0
  const checks = [
    {
      label: 'Has competencies',
      pass: dimensions.length > 0,
      message:
        dimensions.length > 0
          ? `${dimensions.length} competencies configured`
          : 'No competencies configured yet.',
      blocking: true,
    },
    {
      label: 'Competencies have 3+ items',
      pass: dimensionsWithFewItems.length === 0,
      message:
        dimensionsWithFewItems.length === 0
          ? 'All competencies have at least 3 active questions.'
          : `${dimensionsWithFewItems.length} competencies have fewer than 3 active questions.`,
      blocking: true,
    },
    {
      label: 'Band meanings configured',
      pass: dimensionsWithNoBands.length === 0,
      message:
        dimensionsWithNoBands.length === 0
          ? 'Every competency has score-meaning bands.'
          : `${dimensionsWithNoBands.length} competencies are missing score-meaning bands.`,
      blocking: true,
    },
    {
      label: 'Scale configured',
      pass: hasScale,
      message: hasScale
        ? `${normalized.scale_config!.points}-point scale configured.`
        : 'No response scale configured.',
      blocking: true,
    },
    {
      label: 'Classifications configured',
      pass: hasClassifications,
      message: hasClassifications
        ? `${classifications.length} classifications available.`
        : 'No classifications configured.',
      blocking: true,
    },
    {
      label: 'Classification logic configured',
      pass: hasClassificationLogic,
      message: hasClassificationLogic
        ? 'Classification rules or exact overrides are configured.'
        : 'Add classification signals, a default fallback, or exact overrides.',
      blocking: true,
    },
    {
      label: 'Coverage complete',
      pass: coverage.ok,
      message: coverage.ok
        ? `All ${coverage.combinations_total} band combinations resolve to one classification.`
        : `${coverage.issues.length} coverage issues detected.`,
      blocking: true,
    },
  ]

  return {
    config: normalized,
    coverage,
    checks,
    canPublish: checks.every((check) => !check.blocking || check.pass),
  }
}
