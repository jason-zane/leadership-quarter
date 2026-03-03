import {
  classifyResult,
  computeScores,
  getBands,
  type NumericResponseMap,
} from '@/utils/surveys/scoring-engine'
import type { ScoringConfig } from '@/utils/surveys/types'

export const AI_READINESS_QUESTION_KEYS = [
  'q1',
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
  'q7',
  'q8',
  'q9',
  'q10',
  'q11',
  'q12',
  'q13',
  'q14',
  'q15',
  'q16',
  'q17',
  'q18',
] as const

export type AiReadinessQuestionKey = (typeof AI_READINESS_QUESTION_KEYS)[number]
export type LikertValue = 1 | 2 | 3 | 4 | 5

export type AiReadinessResponses = Record<AiReadinessQuestionKey, LikertValue>

export type AiReadinessClassification =
  | 'AI-Ready Operator'
  | 'Naive Enthusiast'
  | 'Cautious Traditionalist'
  | 'Eager but Underdeveloped'
  | 'AI Resistant'
  | 'Developing Operator'

export type OpennessBand =
  | 'Early Adopter'
  | 'Conditional Adopter'
  | 'Resistant / Hesitant'

export type RiskBand =
  | 'Calibrated & Risk-Aware'
  | 'Moderate Awareness'
  | 'Blind Trust or Low Risk Sensitivity'

export type CapabilityBand =
  | 'Confident & Skilled'
  | 'Developing'
  | 'Low Confidence'

export type AiReadinessScores = {
  openness: number
  riskPosture: number
  capability: number
}

export type AiReadinessBands = {
  openness: OpennessBand
  riskPosture: RiskBand
  capability: CapabilityBand
}

const REVERSE_CODED_KEYS: ReadonlySet<AiReadinessQuestionKey> = new Set(['q4', 'q10', 'q16'])

const scoringConfig: ScoringConfig = {
  dimensions: [
    {
      key: 'openness',
      label: 'Openness to AI',
      question_keys: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
      thresholds: { high: 4, mid: 3 },
      bands: {
        high: 'Early Adopter',
        mid: 'Conditional Adopter',
        low: 'Resistant / Hesitant',
      },
    },
    {
      key: 'riskPosture',
      label: 'Risk Posture',
      question_keys: ['q7', 'q8', 'q9', 'q10', 'q11', 'q12'],
      thresholds: { high: 4, mid: 3 },
      bands: {
        high: 'Calibrated & Risk-Aware',
        mid: 'Moderate Awareness',
        low: 'Blind Trust or Low Risk Sensitivity',
      },
    },
    {
      key: 'capability',
      label: 'Capability',
      question_keys: ['q13', 'q14', 'q15', 'q16', 'q17', 'q18'],
      thresholds: { high: 4, mid: 3 },
      bands: {
        high: 'Confident & Skilled',
        mid: 'Developing',
        low: 'Low Confidence',
      },
    },
  ],
  classifications: [
    {
      key: 'ai_ready_operator',
      label: 'AI-Ready Operator',
      conditions: [
        { dimension: 'openness', operator: '>=', value: 4 },
        { dimension: 'capability', operator: '>=', value: 4 },
        { dimension: 'riskPosture', operator: '>=', value: 4 },
      ],
      recommendations: [
        'Involve this person in AI pilot initiatives and peer enablement.',
        'Give them ownership of high-value workflows where quality and speed both matter.',
        'Use them as a benchmark for practical, responsible AI adoption behavior.',
      ],
    },
    {
      key: 'naive_enthusiast',
      label: 'Naive Enthusiast',
      conditions: [
        { dimension: 'openness', operator: '>=', value: 4 },
        { dimension: 'riskPosture', operator: '<', value: 3 },
      ],
      recommendations: [
        'Prioritize governance and output verification habits before scaling usage.',
        'Introduce simple risk-check routines for privacy, ethics, and factual reliability.',
        'Pair experimentation with quality controls to reduce avoidable errors.',
      ],
    },
    {
      key: 'cautious_traditionalist',
      label: 'Cautious Traditionalist',
      conditions: [
        { dimension: 'riskPosture', operator: '>=', value: 4 },
        { dimension: 'openness', operator: '<', value: 3 },
      ],
      recommendations: [
        'Build confidence through low-risk, role-relevant AI experiments.',
        'Set short practice cycles focused on value discovery, not tool complexity.',
        'Use examples of safe, high-quality AI use to reduce adoption friction.',
      ],
    },
    {
      key: 'eager_but_underdeveloped',
      label: 'Eager but Underdeveloped',
      conditions: [
        { dimension: 'openness', operator: '>=', value: 4 },
        { dimension: 'capability', operator: '<', value: 3 },
      ],
      recommendations: [
        'Focus on practical skill-building: prompting, validation, and workflow integration.',
        'Use guided templates and coaching to improve outcome quality quickly.',
        'Reinforce when to escalate to human judgement in high-stakes contexts.',
      ],
    },
    {
      key: 'ai_resistant',
      label: 'AI Resistant',
      conditions: [
        { dimension: 'openness', operator: '<', value: 3 },
        { dimension: 'capability', operator: '<', value: 3 },
      ],
      recommendations: [
        'Start with mindset and relevance: show direct role-level benefits.',
        'Use small wins to build confidence before introducing advanced practices.',
        'Combine support, structure, and repeated practice to shift adoption behavior.',
      ],
    },
    {
      key: 'developing_operator',
      label: 'Developing Operator',
      conditions: [],
      recommendations: [
        'Continue strengthening all three axes with targeted, role-specific development.',
        'Measure progress over time to move from moderate to high capability.',
        'Use practical feedback loops to improve confidence, judgement, and outcomes.',
      ],
    },
  ],
}

function toNumericResponses(responses: AiReadinessResponses): NumericResponseMap {
  return AI_READINESS_QUESTION_KEYS.reduce((acc, key) => {
    acc[key] = responses[key]
    return acc
  }, {} as NumericResponseMap)
}

export function reverseLikert(value: LikertValue): LikertValue {
  return (6 - value) as LikertValue
}

export function normalizeResponses(responses: AiReadinessResponses): AiReadinessResponses {
  return AI_READINESS_QUESTION_KEYS.reduce((acc, key) => {
    const value = responses[key]
    acc[key] = REVERSE_CODED_KEYS.has(key) ? reverseLikert(value) : value
    return acc
  }, {} as AiReadinessResponses)
}

export function computeAiReadinessScores(responses: AiReadinessResponses): AiReadinessScores {
  const normalized = normalizeResponses(responses)
  const rawScores = computeScores(toNumericResponses(normalized), scoringConfig)

  return {
    openness: Number(rawScores.openness ?? 0),
    riskPosture: Number(rawScores.riskPosture ?? 0),
    capability: Number(rawScores.capability ?? 0),
  }
}

export function getAiReadinessBands(scores: AiReadinessScores): AiReadinessBands {
  const mapped = getBands(scores, scoringConfig)

  return {
    openness: mapped.openness as OpennessBand,
    riskPosture: mapped.riskPosture as RiskBand,
    capability: mapped.capability as CapabilityBand,
  }
}

export function classifyAiReadiness(scores: AiReadinessScores): AiReadinessClassification {
  const classification = classifyResult(scores, scoringConfig)
  return (classification?.label ?? 'Developing Operator') as AiReadinessClassification
}

export function classifyAiReadinessFull(scores: AiReadinessScores): { key: string; label: AiReadinessClassification } {
  const classification = classifyResult(scores, scoringConfig)
  return {
    key: classification?.key ?? 'developing_operator',
    label: (classification?.label ?? 'Developing Operator') as AiReadinessClassification,
  }
}

export function getAiReadinessRecommendations(classification: AiReadinessClassification): string[] {
  const found = scoringConfig.classifications.find((item) => item.label === classification)
  return found?.recommendations ?? []
}

export const AI_READINESS_REVERSE_CODED_KEYS: readonly AiReadinessQuestionKey[] = ['q4', 'q10', 'q16']
