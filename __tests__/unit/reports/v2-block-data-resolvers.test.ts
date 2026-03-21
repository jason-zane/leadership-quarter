import { describe, expect, it } from 'vitest'
import { resolveBlockData } from '@/utils/reports/assessment-report-block-data'
import { withAiOrientationDerivedOutcomeSeed } from '@/utils/assessments/assessment-derived-outcome-seeds'
import { createEmptyV2ScoringConfig } from '@/utils/assessments/assessment-scoring'
import type { V2ReportBlockDefinition } from '@/utils/assessments/assessment-report-template'

describe('v2 block data resolvers', () => {
  it('resolves a derived outcome from preview sample band data', () => {
    const scoringConfig = withAiOrientationDerivedOutcomeSeed(createEmptyV2ScoringConfig())
    const block: V2ReportBlockDefinition = {
      id: 'derived_1',
      source: 'derived_outcome',
      format: 'hero_card',
      enabled: true,
      filter: { outcome_set_key: 'ai_orientation_profile' },
    }

    const data = resolveBlockData(block, {
      assessmentId: 'assessment_1',
      sampleProfileId: 'ai_orientation_sample',
      scoringConfig,
    })

    expect(data?.derivedOutcome?.key).toBe('developing_operator')
    expect(data?.items).toEqual([
      expect.objectContaining({ key: 'openness', band: 'Conditional Adopter' }),
      expect.objectContaining({ key: 'riskPosture', band: 'Moderate Awareness' }),
      expect.objectContaining({ key: 'capability', band: 'Developing' }),
    ])
  })

  it('uses derived outcome recommendations when requested', () => {
    const scoringConfig = withAiOrientationDerivedOutcomeSeed(createEmptyV2ScoringConfig())
    const block: V2ReportBlockDefinition = {
      id: 'recommendations_1',
      source: 'recommendations',
      format: 'bullet_list',
      enabled: true,
      filter: { outcome_set_key: 'ai_orientation_profile' },
    }

    const data = resolveBlockData(block, {
      assessmentId: 'assessment_1',
      sampleProfileId: 'ai_orientation_sample',
      scoringConfig,
    })

    expect(data?.items[0]?.description).toContain('Continue strengthening all three axes')
  })
})
