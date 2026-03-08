import { describe, it, expect } from 'vitest'
import { computeScores, classifyResult, getBands } from '@/utils/assessments/scoring-engine'
import type { ScoringConfig } from '@/utils/assessments/types'

// ---------------------------------------------------------------------------
// V1 config fixture (no classification_matrix → stays version 1 after normalisation)
// This is needed to exercise the conditions-based classification loop and
// evaluateCondition operators which are bypassed in v2 configs.
// ---------------------------------------------------------------------------

function makeV1Config(overrides: Partial<ScoringConfig> = {}): ScoringConfig {
  return {
    version: 1,
    scale_config: { points: 5, labels: ['SD', 'D', 'N', 'A', 'SA'] },
    dimensions: [
      {
        key: 'strategy',
        label: 'Strategy',
        question_keys: ['q1', 'q2', 'q3'],
        bands: [
          { key: 'low', label: 'Low', min_score: 1, max_score: 2.5 },
          { key: 'mid', label: 'Mid', min_score: 2.6, max_score: 3.9 },
          { key: 'high', label: 'High', min_score: 4, max_score: 5 },
        ],
      },
    ],
    classifications: [
      {
        key: 'leader',
        label: 'Leader',
        conditions: [{ dimension: 'strategy', operator: '>=', value: 4 }],
        recommendations: [],
      },
      {
        key: 'developing',
        label: 'Developing',
        conditions: [],
        recommendations: [],
      },
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<ScoringConfig> = {}): ScoringConfig {
  return {
    version: 1,
    scale_config: { points: 5, labels: ['SD', 'D', 'N', 'A', 'SA'] },
    dimensions: [
      {
        key: 'strategy',
        label: 'Strategy',
        question_keys: ['q1', 'q2', 'q3'],
        bands: [
          { key: 'low', label: 'Low', min_score: 1, max_score: 2.5 },
          { key: 'mid', label: 'Mid', min_score: 2.6, max_score: 3.9 },
          { key: 'high', label: 'High', min_score: 4, max_score: 5 },
        ],
      },
      {
        key: 'execution',
        label: 'Execution',
        question_keys: ['q4', 'q5'],
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
        conditions: [
          { dimension: 'strategy', operator: '>=', value: 4 },
          { dimension: 'execution', operator: '>=', value: 3 },
        ],
        recommendations: ['Keep it up'],
      },
      {
        key: 'developing',
        label: 'Developing',
        conditions: [],
        recommendations: ['Work harder'],
      },
    ],
    classification_matrix: [],
    classification_overrides: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// computeScores
// ---------------------------------------------------------------------------

describe('computeScores', () => {
  it('calculates dimension averages correctly', () => {
    const config = makeConfig()
    const scores = computeScores({ q1: 4, q2: 5, q3: 3, q4: 4, q5: 2 }, config)
    expect(scores['strategy']).toBeCloseTo(4.0)
    expect(scores['execution']).toBeCloseTo(3.0)
  })

  it('rounds to one decimal place', () => {
    const config = makeConfig()
    const scores = computeScores({ q1: 1, q2: 2, q3: 3, q4: 1, q5: 2 }, config)
    expect(scores['strategy']).toBe(2.0)
  })

  it('missing responses default to 0 (treated as absent)', () => {
    const config = makeConfig()
    const scores = computeScores({ q1: 3, q2: 3 }, config)
    // q3 missing → treated as 0: (3+3+0)/3 = 2
    expect(scores['strategy']).toBe(2.0)
  })

  it('returns empty map for config with no dimensions', () => {
    const config = makeConfig({ dimensions: [] })
    const scores = computeScores({ q1: 5 }, config)
    expect(Object.keys(scores)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// classifyResult
// ---------------------------------------------------------------------------

describe('classifyResult (v1 — condition-based)', () => {
  it('matches correct classification when all conditions met', () => {
    const config = makeConfig()
    const result = classifyResult({ strategy: 4.5, execution: 4.0 }, config)
    expect(result?.key).toBe('leader')
  })

  it('falls through to catch-all classification when conditions not met', () => {
    const config = makeConfig()
    const result = classifyResult({ strategy: 2.0, execution: 2.0 }, config)
    expect(result?.key).toBe('developing')
  })

  it('returns null when no classification matches and no catch-all', () => {
    const config = makeConfig({
      classifications: [
        {
          key: 'leader',
          label: 'Leader',
          conditions: [{ dimension: 'strategy', operator: '>=', value: 4 }],
          recommendations: [],
        },
      ],
    })
    const result = classifyResult({ strategy: 2.0, execution: 2.0 }, config)
    expect(result).toBeNull()
  })

  it('boundary value: exactly at threshold is classified as high', () => {
    const config = makeConfig()
    // strategy >= 4, execution >= 3 → leader
    const result = classifyResult({ strategy: 4.0, execution: 3.0 }, config)
    expect(result?.key).toBe('leader')
  })

  it('boundary value: just below threshold falls to next', () => {
    const config = makeConfig()
    const result = classifyResult({ strategy: 3.9, execution: 3.0 }, config)
    expect(result?.key).toBe('developing')
  })
})

// ---------------------------------------------------------------------------
// getBands
// ---------------------------------------------------------------------------

describe('getBands', () => {
  it('returns correct band labels for given scores', () => {
    const config = makeConfig()
    const bands = getBands({ strategy: 4.5, execution: 2.0 }, config)
    expect(bands['strategy']).toBe('High')
    expect(bands['execution']).toBe('Low')
  })

  it('handles score at min_score boundary of band', () => {
    const config = makeConfig()
    const bands = getBands({ strategy: 4.0, execution: 3.0 }, config)
    expect(bands['strategy']).toBe('High')
    expect(bands['execution']).toBe('High')
  })

  it('handles zero scores gracefully', () => {
    const config = makeConfig()
    const bands = getBands({ strategy: 0, execution: 0 }, config)
    // Should return some band (lowest), not throw
    expect(typeof bands['strategy']).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// classifyResult (v1 — true version-1 config, exercises conditions loop)
// ---------------------------------------------------------------------------

describe('classifyResult (v1 — conditions loop via true v1 config)', () => {
  it('matches when >= condition is met', () => {
    const config = makeV1Config()
    expect(classifyResult({ strategy: 4.0 }, config)?.key).toBe('leader')
  })

  it('falls through to catch-all when condition not met', () => {
    const config = makeV1Config()
    expect(classifyResult({ strategy: 3.9 }, config)?.key).toBe('developing')
  })

  it('returns null when no classification matches and no catch-all', () => {
    const config = makeV1Config({
      classifications: [
        {
          key: 'leader',
          label: 'Leader',
          conditions: [{ dimension: 'strategy', operator: '>=', value: 4 }],
          recommendations: [],
        },
      ],
    })
    expect(classifyResult({ strategy: 2.0 }, config)).toBeNull()
  })

  it('operator > (strictly greater than)', () => {
    const config = makeV1Config({
      classifications: [
        { key: 'high', label: 'High', conditions: [{ dimension: 'strategy', operator: '>', value: 3 }], recommendations: [] },
      ],
    })
    expect(classifyResult({ strategy: 3.1 }, config)?.key).toBe('high')
    expect(classifyResult({ strategy: 3.0 }, config)).toBeNull()
  })

  it('operator < (strictly less than)', () => {
    const config = makeV1Config({
      classifications: [
        { key: 'low', label: 'Low', conditions: [{ dimension: 'strategy', operator: '<', value: 3 }], recommendations: [] },
      ],
    })
    expect(classifyResult({ strategy: 2.9 }, config)?.key).toBe('low')
    expect(classifyResult({ strategy: 3.0 }, config)).toBeNull()
  })

  it('operator <= (less than or equal)', () => {
    const config = makeV1Config({
      classifications: [
        { key: 'low', label: 'Low', conditions: [{ dimension: 'strategy', operator: '<=', value: 3 }], recommendations: [] },
      ],
    })
    expect(classifyResult({ strategy: 3.0 }, config)?.key).toBe('low')
    expect(classifyResult({ strategy: 3.1 }, config)).toBeNull()
  })

  it('operator = (exact match)', () => {
    const config = makeV1Config({
      classifications: [
        { key: 'exact', label: 'Exact', conditions: [{ dimension: 'strategy', operator: '=', value: 3 }], recommendations: [] },
      ],
    })
    expect(classifyResult({ strategy: 3 }, config)?.key).toBe('exact')
    expect(classifyResult({ strategy: 4 }, config)).toBeNull()
  })

  it('operator != (not equal)', () => {
    const config = makeV1Config({
      classifications: [
        { key: 'other', label: 'Other', conditions: [{ dimension: 'strategy', operator: '!=', value: 3 }], recommendations: [] },
      ],
    })
    expect(classifyResult({ strategy: 4 }, config)?.key).toBe('other')
    expect(classifyResult({ strategy: 3 }, config)).toBeNull()
  })
})
