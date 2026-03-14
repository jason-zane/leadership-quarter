import { describe, expect, it } from 'vitest'
import { createAiReadinessV2QuestionBank, createAiReadinessV2ScoringConfig } from '@/utils/assessments/ai-readiness-v2-blueprint'
import { buildV2SubmissionArtifacts, scoreV2AssessmentSubmission } from '@/utils/assessments/v2-runtime'
import {
  AI_READINESS_REVERSE_CODED_KEYS,
  classifyAiReadiness,
  computeAiReadinessScores,
  getAiReadinessBands,
  getAiReadinessRecommendations,
  type AiReadinessQuestionKey,
  type AiReadinessResponses,
  type LikertValue,
} from '@/utils/services/ai-readiness-scoring'
import {
  getAiOrientationAxisCommentary,
  getAiOrientationProfileNarrative,
} from '@/utils/reports/ai-orientation-report'

const questionBank = createAiReadinessV2QuestionBank()
const scoringConfig = createAiReadinessV2ScoringConfig()

const DIMENSION_ITEMS: Record<'openness' | 'riskPosture' | 'capability', AiReadinessQuestionKey[]> = {
  openness: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
  riskPosture: ['q7', 'q8', 'q9', 'q10', 'q11', 'q12'],
  capability: ['q13', 'q14', 'q15', 'q16', 'q17', 'q18'],
}

function toRawValue(key: AiReadinessQuestionKey, normalizedValue: LikertValue): LikertValue {
  return AI_READINESS_REVERSE_CODED_KEYS.includes(key) ? (6 - normalizedValue) as LikertValue : normalizedValue
}

function buildResponses(input: {
  openness: LikertValue
  riskPosture: LikertValue
  capability: LikertValue
}): AiReadinessResponses {
  const responseMap = {} as AiReadinessResponses

  for (const [dimensionKey, itemKeys] of Object.entries(DIMENSION_ITEMS) as Array<[keyof typeof DIMENSION_ITEMS, AiReadinessQuestionKey[]]>) {
    const normalizedValue = input[dimensionKey]
    for (const key of itemKeys) {
      responseMap[key] = toRawValue(key, normalizedValue)
    }
  }

  return responseMap
}

describe('AI readiness V2 parity', () => {
  it('matches V1 banding, classification, recommendations, and narratives across all band combinations', () => {
    const scoreLevels: LikertValue[] = [2, 3, 4]

    for (const openness of scoreLevels) {
      for (const riskPosture of scoreLevels) {
        for (const capability of scoreLevels) {
          const responses = buildResponses({ openness, riskPosture, capability })
          const v1Scores = computeAiReadinessScores(responses)
          const v1Bands = getAiReadinessBands(v1Scores)
          const v1Classification = classifyAiReadiness(v1Scores)
          const v1Recommendations = getAiReadinessRecommendations(v1Classification)

          const v2Result = scoreV2AssessmentSubmission({
            questionBank,
            scoringConfig,
            responses,
          })
          const v2Artifacts = buildV2SubmissionArtifacts({
            questionBank,
            scoringConfig,
            responses,
            metadata: {
              assessmentVersion: 1,
              deliveryMode: 'preview',
            },
          })

          expect(v2Result.dimensionScores.map((item) => item.value)).toEqual([
            v1Scores.openness,
            v1Scores.riskPosture,
            v1Scores.capability,
          ])
          expect(v2Result.dimensionScores.map((item) => item.bandLabel)).toEqual([
            v1Bands.openness,
            v1Bands.riskPosture,
            v1Bands.capability,
          ])
          expect(v2Result.classification?.label).toBe(v1Classification)
          expect(v2Result.recommendations).toEqual(v1Recommendations)
          expect(v2Artifacts.reportContext.classification?.description).toBe(
            getAiOrientationProfileNarrative(v1Classification)
          )
          expect(v2Artifacts.reportContext.interpretations.map((item) => item.description)).toEqual([
            getAiOrientationAxisCommentary('curiosity', v1Bands.openness),
            getAiOrientationAxisCommentary('judgement', v1Bands.riskPosture),
            getAiOrientationAxisCommentary('skill', v1Bands.capability),
          ])
        }
      }
    }
  })
})
