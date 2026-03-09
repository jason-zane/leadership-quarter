import { describe, expect, it } from 'vitest'
import {
  resolveAssessmentInterpretations,
  sortAssessmentTraitScores,
  type AssessmentReportData,
} from '@/utils/reports/assessment-report'

const scoringConfig = {
  dimensions: [
    { key: 'openness', label: 'Openness to AI', bands: [] },
    { key: 'riskPosture', label: 'Risk Posture', bands: [] },
    { key: 'capability', label: 'Capability', bands: [] },
  ],
  classifications: [],
}

function makeTraitScore(
  overrides: Partial<AssessmentReportData['traitScores'][number]>
): AssessmentReportData['traitScores'][number] {
  return {
    traitId: 'trait-default',
    traitCode: 'default',
    traitName: 'Default',
    traitExternalName: null,
    dimensionId: 'dim-default',
    dimensionCode: 'default',
    dimensionName: 'Default',
    dimensionExternalName: null,
    dimensionPosition: null,
    rawScore: 3,
    zScore: null,
    percentile: null,
    band: null,
    alpha: null,
    normSd: null,
    ...overrides,
  }
}

describe('assessment report helpers', () => {
  it('sorts trait scores to match the configured report dimension order', () => {
    const traitScores = [
      makeTraitScore({
        traitId: 'trait-capability',
        traitCode: 'capability',
        traitName: 'Capability',
        dimensionId: 'dim-capability',
        dimensionCode: 'capability',
        dimensionName: 'Capability',
        dimensionPosition: 2,
      }),
      makeTraitScore({
        traitId: 'trait-openness',
        traitCode: 'openness',
        traitName: 'Openness to AI',
        dimensionId: 'dim-openness',
        dimensionCode: 'openness',
        dimensionName: 'Openness to AI',
        dimensionPosition: 0,
      }),
      makeTraitScore({
        traitId: 'trait-risk',
        traitCode: 'riskPosture',
        traitName: 'Risk Posture',
        dimensionId: 'dim-risk',
        dimensionCode: 'riskPosture',
        dimensionName: 'Risk Posture',
        dimensionPosition: 1,
      }),
    ]

    const ordered = sortAssessmentTraitScores(traitScores, scoringConfig)

    expect(ordered.map((trait) => trait.traitCode)).toEqual([
      'openness',
      'riskPosture',
      'capability',
    ])
  })

  it('matches interpretation rules against their configured targets instead of any matching trait percentile', () => {
    const traitScores = sortAssessmentTraitScores([
      makeTraitScore({
        traitId: 'trait-capability',
        traitCode: 'capability',
        traitName: 'Capability',
        dimensionId: 'dim-capability',
        dimensionCode: 'capability',
        dimensionName: 'Capability',
        dimensionPosition: 2,
        percentile: 20,
      }),
      makeTraitScore({
        traitId: 'trait-openness',
        traitCode: 'openness',
        traitName: 'Openness to AI',
        dimensionId: 'dim-openness',
        dimensionCode: 'openness',
        dimensionName: 'Openness to AI',
        dimensionPosition: 0,
        percentile: 57,
      }),
      makeTraitScore({
        traitId: 'trait-risk',
        traitCode: 'riskPosture',
        traitName: 'Risk Posture',
        dimensionId: 'dim-risk',
        dimensionCode: 'riskPosture',
        dimensionName: 'Risk Posture',
        dimensionPosition: 1,
        percentile: 49,
      }),
    ], scoringConfig)

    const interpretations = resolveAssessmentInterpretations(
      traitScores,
      [
        {
          target_type: 'trait',
          target_id: 'trait-capability',
          rule_type: 'band_text',
          min_percentile: 34,
          max_percentile: 66,
          title: 'Capability mid band',
          body: 'Should not match.',
          priority: 0,
        },
        {
          target_type: 'trait',
          target_id: 'trait-openness',
          rule_type: 'band_text',
          min_percentile: 34,
          max_percentile: 66,
          title: 'Openness mid band',
          body: 'Matches openness.',
          priority: 0,
        },
        {
          target_type: 'trait',
          target_id: 'trait-risk',
          rule_type: 'band_text',
          min_percentile: 34,
          max_percentile: 66,
          title: 'Risk mid band',
          body: 'Matches risk.',
          priority: 0,
        },
        {
          target_type: 'dimension',
          target_id: 'dim-capability',
          rule_type: 'coaching_tip',
          min_percentile: 0,
          max_percentile: 33,
          title: 'Capability benchmark insight',
          body: 'Matches capability dimension.',
          priority: 0,
        },
        {
          target_type: 'overall',
          target_id: null,
          rule_type: 'recommendation',
          min_percentile: 40,
          max_percentile: 50,
          title: 'Overall benchmark insight',
          body: 'Matches the average percentile.',
          priority: 0,
        },
      ],
      scoringConfig
    )

    expect(interpretations.map((rule) => rule.title)).toEqual([
      'Openness mid band',
      'Risk mid band',
      'Capability benchmark insight',
      'Overall benchmark insight',
    ])
  })
})
