import { describe, expect, it } from 'vitest'
import {
  analyzeDerivedOutcomeCoverage,
  createEmptyV2ScoringConfig,
  getDerivedOutcomeSet,
  resolveDerivedOutcome,
  upsertBandingConfig,
  upsertDerivedOutcomeSet,
} from '@/utils/assessments/assessment-scoring'
import { withAiOrientationDerivedOutcomeSeed } from '@/utils/assessments/assessment-derived-outcome-seeds'

describe('v2 derived outcomes', () => {
  it('resolves exact combinations from the AI orientation seed', () => {
    const config = withAiOrientationDerivedOutcomeSeed(createEmptyV2ScoringConfig())
    const outcomeSet = getDerivedOutcomeSet(config, 'ai_orientation_profile')

    expect(outcomeSet).toBeTruthy()
    expect(resolveDerivedOutcome(config, outcomeSet!, {
      openness: 'early_adopter',
      riskPosture: 'calibrated_risk_aware',
      capability: 'confident_skilled',
    })).toEqual(expect.objectContaining({
      status: 'matched',
      outcome: expect.objectContaining({ key: 'ai_ready_operator' }),
    }))

    expect(resolveDerivedOutcome(config, outcomeSet!, {
      openness: 'early_adopter',
      riskPosture: 'low_risk_sensitivity',
      capability: 'developing',
    })).toEqual(expect.objectContaining({
      status: 'matched',
      outcome: expect.objectContaining({ key: 'naive_enthusiast' }),
    }))
  })

  it('reports full coverage for the AI orientation seed', () => {
    const config = withAiOrientationDerivedOutcomeSeed(createEmptyV2ScoringConfig())
    const outcomeSet = getDerivedOutcomeSet(config, 'ai_orientation_profile')
    const coverage = analyzeDerivedOutcomeCoverage(config, outcomeSet!)

    expect(coverage.ok).toBe(true)
    expect(coverage.totalCombinations).toBe(27)
    expect(coverage.resolvedCombinations).toBe(27)
    expect(coverage.issues).toEqual([])
  })

  it('prefers exact mappings over wildcard mappings', () => {
    let config = createEmptyV2ScoringConfig()
    config = upsertBandingConfig(config, {
      level: 'dimension',
      targetKey: 'openness',
      bands: [
        { id: 'low', label: 'Low', min: 1, max: 2.9, color: '#ccc', meaning: '', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' },
        { id: 'high', label: 'High', min: 3, max: 5, color: '#0f0', meaning: '', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' },
      ],
    })
    config = upsertBandingConfig(config, {
      level: 'dimension',
      targetKey: 'capability',
      bands: [
        { id: 'low', label: 'Low', min: 1, max: 2.9, color: '#ccc', meaning: '', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' },
        { id: 'high', label: 'High', min: 3, max: 5, color: '#0f0', meaning: '', behaviouralIndicators: '', strengths: '', watchouts: '', developmentFocus: '', narrativeText: '' },
      ],
    })
    config = upsertDerivedOutcomeSet(config, {
      id: 'set_1',
      key: 'set_1',
      name: 'Set 1',
      description: '',
      level: 'dimension',
      targetKeys: ['openness', 'capability'],
      outcomes: [
        {
          id: 'default',
          key: 'default',
          label: 'Default',
          shortDescription: '',
          reportSummary: '',
          fullNarrative: '',
          recommendations: [],
          sortOrder: 1,
        },
        {
          id: 'specific',
          key: 'specific',
          label: 'Specific',
          shortDescription: '',
          reportSummary: '',
          fullNarrative: '',
          recommendations: [],
          sortOrder: 2,
        },
      ],
      mappings: [
        {
          id: 'wildcard',
          combination: { openness: 'high', capability: '*' },
          outcomeKey: 'default',
          rationale: '',
        },
        {
          id: 'exact',
          combination: { openness: 'high', capability: 'high' },
          outcomeKey: 'specific',
          rationale: '',
        },
      ],
    })

    const outcomeSet = getDerivedOutcomeSet(config, 'set_1')
    const resolution = resolveDerivedOutcome(config, outcomeSet!, {
      openness: 'high',
      capability: 'high',
    })

    expect(resolution).toEqual(expect.objectContaining({
      status: 'matched',
      outcome: expect.objectContaining({ key: 'specific' }),
    }))
  })
})
