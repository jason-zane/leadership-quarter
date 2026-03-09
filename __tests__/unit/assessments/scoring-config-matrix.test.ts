import { describe, expect, it } from 'vitest'
import {
  buildClassificationCombinations,
  buildCombinationPage,
  buildMatrixPreviewRows,
  findClassificationMatrixCell,
  findClassificationOverride,
  getClassificationCombinationCount,
  getDecisionDimensionKeys,
  resolveClassificationCombination,
} from '@/utils/assessments/scoring-config'
import type { ScoringConfig } from '@/utils/assessments/types'

function makeConfig(overrides: Partial<ScoringConfig> = {}): ScoringConfig {
  return {
    version: 2,
    scale_config: {
      points: 5,
      labels: ['SD', 'D', 'N', 'A', 'SA'],
    },
    dimensions: [
      {
        key: 'strategy',
        label: 'Strategy',
        question_keys: ['q1'],
        bands: [
          { key: 'low', label: 'Low', min_score: 1, max_score: 2.9 },
          { key: 'high', label: 'High', min_score: 3, max_score: 5 },
        ],
      },
      {
        key: 'execution',
        label: 'Execution',
        question_keys: ['q2'],
        bands: [
          { key: 'low', label: 'Low', min_score: 1, max_score: 2.9 },
          { key: 'high', label: 'High', min_score: 3, max_score: 5 },
        ],
      },
    ],
    classifications: [
      {
        key: 'leader',
        label: 'Leader',
        conditions: [],
        recommendations: [],
        preferred_signals: [
          { dimension: 'strategy', band_key: 'high', weight: 2 },
          { dimension: 'execution', band_key: 'high', weight: 1 },
        ],
        excluded_signals: [{ dimension: 'execution', band_key: 'low' }],
      },
      {
        key: 'operator',
        label: 'Operator',
        conditions: [],
        recommendations: [],
        preferred_signals: [{ dimension: 'execution', band_key: 'high', weight: 2 }],
      },
      {
        key: 'fallback',
        label: 'Fallback',
        conditions: [],
        recommendations: [],
      },
    ],
    classification_overrides: [
      {
        combination: { strategy: 'low', execution: 'high' },
        classification_key: 'leader',
        source: 'manual',
      },
    ],
    classification_matrix: [
      {
        combination: { strategy: '*', execution: 'high' },
        classification_key: 'operator',
        source: 'generated',
        rationale: ['Generated row'],
      },
    ],
    ...overrides,
  }
}

describe('scoring-config matrix', () => {
  it('counts and enumerates band combinations', () => {
    const config = makeConfig()

    expect(getClassificationCombinationCount(config)).toBe(4)
    expect(buildClassificationCombinations(config)).toHaveLength(4)
  })

  it('builds wildcarded combination pages for grouped previews', () => {
    const config = makeConfig()

    const page = buildCombinationPage(config, {
      dimensionKeys: ['strategy'],
      wildcardOtherDimensions: true,
      limit: 2,
    })

    expect(page.total).toBe(2)
    expect(page.rows).toEqual([
      { strategy: 'low', execution: '*' },
      { strategy: 'high', execution: '*' },
    ])
  })

  it('resolves exact overrides before rules or generated matrix rows', () => {
    const config = makeConfig()
    const combination = { strategy: 'low', execution: 'high' }

    expect(findClassificationOverride(config, combination)?.classification_key).toBe('leader')
    expect(findClassificationMatrixCell(config, combination)).toBeNull()

    const resolution = resolveClassificationCombination(config, combination)

    expect(resolution).toEqual({
      status: 'matched',
      classification: expect.objectContaining({ key: 'leader' }),
      classification_key: 'leader',
      source: 'override',
      rationale: ['Matched an exact manual override.'],
    })
  })

  it('returns ambiguous when multiple classifications tie on signal score', () => {
    const config = makeConfig({
      classifications: [
        {
          key: 'alpha',
          label: 'Alpha',
          conditions: [],
          recommendations: [],
          preferred_signals: [{ dimension: 'strategy', band_key: 'high', weight: 1 }],
        },
        {
          key: 'beta',
          label: 'Beta',
          conditions: [],
          recommendations: [],
          preferred_signals: [{ dimension: 'strategy', band_key: 'high', weight: 1 }],
        },
      ],
      classification_overrides: [],
      classification_matrix: [],
    })

    expect(resolveClassificationCombination(config, { strategy: 'high', execution: 'low' })).toEqual({
      status: 'ambiguous',
      rationale: ['Multiple classifications matched the same weighted score.'],
    })
  })

  it('builds grouped matrix previews when exact combinations exceed the preview limit', () => {
    const config = makeConfig({
      dimensions: Array.from({ length: 4 }, (_, index) => ({
        key: `dimension_${index + 1}`,
        label: `Dimension ${index + 1}`,
        question_keys: [`q${index + 1}`],
        bands: [
          { key: 'a', label: 'A', min_score: 1, max_score: 1.9 },
          { key: 'b', label: 'B', min_score: 2, max_score: 2.9 },
          { key: 'c', label: 'C', min_score: 3, max_score: 3.9 },
          { key: 'd', label: 'D', min_score: 4, max_score: 5 },
        ],
      })),
      classifications: [
        {
          key: 'fallback',
          label: 'Fallback',
          conditions: [],
          recommendations: [],
        },
      ],
      classification_overrides: [],
      classification_matrix: [],
    })

    expect(getDecisionDimensionKeys(config)).toEqual([])

    const preview = buildMatrixPreviewRows(config, { limit: 5 })

    expect(preview.grouped).toBe(true)
    expect(preview.total_exact_combinations).toBe(256)
    expect(preview.rows[0]).toEqual(
      expect.objectContaining({
        grouped: true,
        editable: false,
        source: 'generated',
      })
    )
  })
})
