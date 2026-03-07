import {
  classifyResult,
  computeScores,
  getBands,
  type NumericResponseMap,
} from '@/utils/assessments/scoring-engine'
import { upgradeScoringConfigToV2 } from '@/utils/assessments/scoring-config'
import type { ScoringConfig } from '@/utils/assessments/types'

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

const scoringConfig: ScoringConfig = upgradeScoringConfigToV2({
  dimensions: [
    {
      key: 'openness',
      label: 'Openness to AI',
      question_keys: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
      bands: [
        { key: 'resistant_hesitant', label: 'Resistant / Hesitant', min_score: 1, max_score: 2.9, meaning: 'Prefers familiar methods and is cautious about experimenting with AI.' },
        { key: 'conditional_adopter', label: 'Conditional Adopter', min_score: 3, max_score: 3.9, meaning: 'Open to AI when the use case feels practical, relevant, and low-risk.' },
        { key: 'early_adopter', label: 'Early Adopter', min_score: 4, max_score: 5, meaning: 'Actively looks for ways AI can improve quality, speed, or effectiveness.' },
      ],
    },
    {
      key: 'riskPosture',
      label: 'Risk Posture',
      question_keys: ['q7', 'q8', 'q9', 'q10', 'q11', 'q12'],
      bands: [
        { key: 'low_risk_sensitivity', label: 'Blind Trust or Low Risk Sensitivity', min_score: 1, max_score: 2.9, meaning: 'May underestimate the privacy, governance, or judgement risks that come with AI use.' },
        { key: 'moderate_awareness', label: 'Moderate Awareness', min_score: 3, max_score: 3.9, meaning: 'Recognises some risks, but still needs stronger verification and decision routines.' },
        { key: 'calibrated_risk_aware', label: 'Calibrated & Risk-Aware', min_score: 4, max_score: 5, meaning: 'Approaches AI use with strong verification, judgement, and ethical awareness.' },
      ],
    },
    {
      key: 'capability',
      label: 'Capability',
      question_keys: ['q13', 'q14', 'q15', 'q16', 'q17', 'q18'],
      bands: [
        { key: 'low_confidence', label: 'Low Confidence', min_score: 1, max_score: 2.9, meaning: 'Needs more confidence and practical skill to use AI well in role-relevant work.' },
        { key: 'developing', label: 'Developing', min_score: 3, max_score: 3.9, meaning: 'Shows emerging ability, but still needs practice to use AI consistently and well.' },
        { key: 'confident_skilled', label: 'Confident & Skilled', min_score: 4, max_score: 5, meaning: 'Uses AI with practical confidence and can combine it with sound judgement.' },
      ],
    },
  ],
  classifications: [
    {
      key: 'ai_ready_operator',
      label: 'AI-Ready Operator',
      description: 'High openness, strong capability, and sound risk judgement.',
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
      description: 'Enthusiastic about AI, but currently underweights risk and verification.',
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
      description: 'Risk-aware and thoughtful, but still hesitant to adopt AI in practice.',
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
      description: 'Ready to engage, but still building the practical capability to do it well.',
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
      description: 'Currently reluctant to engage with AI and lacking practical confidence.',
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
      description: 'Shows some readiness, but still needs balanced development across the model.',
      conditions: [],
      recommendations: [
        'Continue strengthening all three axes with targeted, role-specific development.',
        'Measure progress over time to move from moderate to high capability.',
        'Use practical feedback loops to improve confidence, judgement, and outcomes.',
      ],
    },
  ],
})

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
