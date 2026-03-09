import { describe, expect, it } from 'vitest'
import {
  buildScoringJsonTemplate,
  parseScoringConfigCsv,
  serializeScoringConfigToCsv,
} from '@/utils/assessments/scoring-csv'
import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import type { ScoringConfig } from '@/utils/assessments/types'

function makeConfig(): ScoringConfig {
  return {
    version: 2,
    scale_config: {
      points: 5,
      labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
    },
    dimensions: [
      {
        key: 'strategy',
        label: 'Strategy',
        description: 'Strategic clarity and direction.',
        question_keys: ['q1', 'q2'],
        bands: [
          { key: 'low', label: 'Low', min_score: 1, max_score: 2.9, meaning: 'Needs more clarity.' },
          { key: 'high', label: 'High', min_score: 3, max_score: 5, meaning: 'Clear strategic direction.' },
        ],
      },
      {
        key: 'execution',
        label: 'Execution',
        question_keys: ['q3'],
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
        recommendations: ['Keep building on the momentum.'],
        description: 'Strong overall profile.',
        automation_rationale: 'High strategic and execution signals.',
        preferred_signals: [{ dimension: 'strategy', band_key: 'high', weight: 1.5 }],
        excluded_signals: [{ dimension: 'execution', band_key: 'low' }],
      },
      {
        key: 'builder',
        label: 'Builder',
        conditions: [],
        recommendations: ['Tighten execution discipline.'],
      },
    ],
    classification_overrides: [
      {
        combination: { strategy: 'high', execution: 'high' },
        classification_key: 'leader',
        source: 'manual',
        rationale: ['Direct fit'],
      },
    ],
    classification_matrix: [
      {
        combination: { strategy: '*', execution: 'high' },
        classification_key: 'builder',
        source: 'generated',
        rationale: ['Generated fallback'],
      },
    ],
  }
}

describe('scoring-csv', () => {
  it('builds a JSON template without matrix rows and without mutating the source', () => {
    const original = makeConfig()
    const template = buildScoringJsonTemplate(original)

    expect(template.classification_overrides).toEqual([])
    expect(template.classification_matrix).toEqual([])

    template.dimensions[0].question_keys.push('q99')
    template.classifications[0].recommendations.push('Extra recommendation')

    expect(original.dimensions[0].question_keys).toEqual(['q1', 'q2'])
    expect(original.classifications[0].recommendations).toEqual([
      'Keep building on the momentum.',
    ])
  })

  it('round-trips a scoring config through CSV export and import', () => {
    const config = makeConfig()
    const csv = serializeScoringConfigToCsv(config)
    const result = parseScoringConfigCsv(csv, config)

    expect(result.errors).toEqual([])
    expect(result.config).toEqual(normalizeScoringConfig(config))
  })

  it('rejects manual matrix rows that use wildcard combinations', () => {
    const config = makeConfig()
    const csv = serializeScoringConfigToCsv(config).replace(
      'strategy=high|execution=high,leader,manual,Direct fit',
      'strategy=high|execution=*,leader,manual,Direct fit'
    )
    const result = parseScoringConfigCsv(csv, config)

    expect(result.config).toBeNull()
    expect(
      result.errors.some((message) =>
        message.includes('cannot use "*" in a manual override combination.')
      )
    ).toBe(true)
  })
})
