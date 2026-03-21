import { describe, expect, it } from 'vitest'
import {
  createAiReadinessQuestionBank,
  createAiReadinessV2ReportTemplate,
  createAiReadinessV2ScoringConfig,
} from '@/utils/assessments/ai-readiness-v2-blueprint'

describe('ai readiness V2 blueprint', () => {
  it('creates the full question bank for the live assessment shape', () => {
    const questionBank = createAiReadinessQuestionBank()

    expect(questionBank.dimensions.map((dimension) => dimension.key)).toEqual([
      'openness',
      'riskPosture',
      'capability',
    ])
    expect(questionBank.competencies).toHaveLength(3)
    expect(questionBank.traits).toHaveLength(3)
    expect(questionBank.scoredItems).toHaveLength(18)
    expect(questionBank.scoredItems.filter((item) => item.isReverseCoded)).toHaveLength(3)
  })

  it('creates a scoring config with derived outcomes and banding coverage across all levels', () => {
    const scoringConfig = createAiReadinessV2ScoringConfig()

    expect(scoringConfig.derivedOutcomes).toHaveLength(1)
    expect(scoringConfig.derivedOutcomes[0]?.mappings).toHaveLength(27)
    expect(scoringConfig.bandings.filter((banding) => banding.level === 'trait')).toHaveLength(3)
    expect(scoringConfig.bandings.filter((banding) => banding.level === 'competency')).toHaveLength(3)
    expect(scoringConfig.bandings.filter((banding) => banding.level === 'dimension')).toHaveLength(3)
    expect(scoringConfig.interpretations.filter((item) => item.level === 'dimension')).toHaveLength(3)
  })

  it('creates a candidate report template with the core V1-equivalent outputs', () => {
    const report = createAiReadinessV2ReportTemplate()

    expect(report.blocks.map((block) => block.source)).toEqual([
      'derived_outcome',
      'dimension_scores',
      'interpretations',
      'recommendations',
      'static_content',
    ])
  })
})
