import { describe, expect, it } from 'vitest'
import {
  createEmptyScoringConfig,
  getAIContext,
  getBandingConfig,
  getInterpretationContent,
  getRollupWeight,
  normalizeScoringConfig,
  setRollupWeight,
  setTraitScoringMethod,
  upsertAIContext,
  upsertBandingConfig,
  upsertInterpretationContent,
} from '@/utils/assessments/assessment-scoring'

describe('v2 scoring config', () => {
  it('normalizes an empty config', () => {
    const config = normalizeScoringConfig(null)
    expect(config.version).toBe(1)
    expect(config.calculation.traitDefaultMethod).toBe('average')
    expect(config.rollups.competency.weights).toEqual([])
  })

  it('stores trait overrides and rollup weights', () => {
    let config = createEmptyScoringConfig()
    config = setTraitScoringMethod(config, 'judgement', 'sum')
    config = normalizeScoringConfig({
      ...config,
      rollups: {
        ...config.rollups,
        competency: {
          ...config.rollups.competency,
          weights: setRollupWeight(config.rollups.competency.weights, 'decision_quality', 'judgement', 1.8),
        },
      },
    })

    expect(config.calculation.traitOverrides[0]).toEqual({ targetKey: 'judgement', method: 'sum' })
    expect(getRollupWeight(config.rollups.competency.weights, 'decision_quality', 'judgement')).toBe(1.8)
  })

  it('upserts banding, interpretation, and ai content per entity', () => {
    let config = createEmptyScoringConfig()
    config = upsertBandingConfig(config, {
      level: 'trait',
      targetKey: 'judgement',
      bands: [{
        id: 'b1',
        label: 'High',
        min: 4,
        max: 5,
        color: '#00FF00',
        meaning: 'High judgement',
        behaviouralIndicators: 'Consistent evidence use',
        strengths: 'Strong judgement',
        watchouts: 'May overanalyse edge cases',
        developmentFocus: 'Keep pace with decisiveness',
        narrativeText: 'Usually makes strong decisions.',
      }],
    })
    config = upsertInterpretationContent(config, {
      level: 'trait',
      targetKey: 'judgement',
      lowMeaning: 'Needs support',
      midMeaning: 'Balanced',
      highMeaning: 'Strong capability',
      behaviouralIndicators: 'Tests important decisions',
      strengths: 'Clear trade-offs',
      risksWatchouts: 'May slow decisions',
      developmentFocus: 'Faster pattern recognition',
      narrativeText: 'Shows strong judgement under pressure.',
    })
    config = upsertAIContext(config, {
      level: 'trait',
      targetKey: 'judgement',
      summary: 'Decision quality trait',
      guidance: 'Use evidence-based language',
      contextNotes: 'High scores often indicate careful evaluation',
      promptHints: 'Avoid overclaiming certainty',
    })

    expect(getBandingConfig(config, 'trait', 'judgement').bands).toHaveLength(1)
    expect(getBandingConfig(config, 'trait', 'judgement').bands[0]?.behaviouralIndicators).toBe('Consistent evidence use')
    expect(getInterpretationContent(config, 'trait', 'judgement').highMeaning).toBe('Strong capability')
    expect(getAIContext(config, 'trait', 'judgement').guidance).toBe('Use evidence-based language')
  })

  it('keeps unlabeled draft bands during normalization', () => {
    const config = normalizeScoringConfig({
      bandings: [{
        level: 'trait',
        targetKey: 'judgement',
        bands: [{
          id: 'draft',
          label: '',
          min: 0,
          max: 0,
          color: '#D0D8E8',
          meaning: '',
        }],
      }],
    })

    expect(getBandingConfig(config, 'trait', 'judgement').bands).toHaveLength(1)
  })
})
