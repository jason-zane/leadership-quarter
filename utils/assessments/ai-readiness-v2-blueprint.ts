import {
  createEmptyV2ScoringConfig,
  normalizeV2ScoringConfig,
  type V2BandingConfig,
  type V2ScoringConfig,
} from '@/utils/assessments/v2-scoring'
import {
  createEmptyV2QuestionBank,
  type V2QuestionBank,
} from '@/utils/assessments/v2-question-bank'
import {
  DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG,
  type AssessmentV2ExperienceConfig,
} from '@/utils/assessments/v2-experience-config'
import { withAiOrientationDerivedOutcomeSeed } from '@/utils/assessments/v2-derived-outcome-seeds'
import type { V2ReportTemplateDefinition } from '@/utils/assessments/v2-report-template'

type AiAxisKey = 'openness' | 'riskPosture' | 'capability'

const AI_READINESS_ITEMS: Array<{
  key: string
  text: string
  traitKey: AiAxisKey
  isReverseCoded: boolean
}> = [
  { key: 'q1', text: 'I actively look for ways AI could improve how I work.', traitKey: 'openness', isReverseCoded: false },
  { key: 'q2', text: 'I enjoy experimenting with AI tools to see what they can do.', traitKey: 'openness', isReverseCoded: false },
  { key: 'q3', text: 'I am comfortable changing how I work when AI offers a better approach.', traitKey: 'openness', isReverseCoded: false },
  { key: 'q4', text: 'I prefer to stick with familiar ways of working rather than explore AI-based alternatives.', traitKey: 'openness', isReverseCoded: true },
  { key: 'q5', text: 'I am curious about how AI could create value in my role.', traitKey: 'openness', isReverseCoded: false },
  { key: 'q6', text: 'I would be confident advocating for useful AI adoption in my team.', traitKey: 'openness', isReverseCoded: false },
  { key: 'q7', text: 'I think carefully about privacy, ethics, and reliability when using AI.', traitKey: 'riskPosture', isReverseCoded: false },
  { key: 'q8', text: 'I verify important AI outputs before acting on them.', traitKey: 'riskPosture', isReverseCoded: false },
  { key: 'q9', text: 'I understand that AI can sound convincing while still being wrong.', traitKey: 'riskPosture', isReverseCoded: false },
  { key: 'q10', text: 'If an AI system sounds confident, I generally assume it is correct.', traitKey: 'riskPosture', isReverseCoded: true },
  { key: 'q11', text: 'I know when AI use would be inappropriate or risky in my role.', traitKey: 'riskPosture', isReverseCoded: false },
  { key: 'q12', text: 'I feel confident navigating grey areas where AI use is not clearly defined.', traitKey: 'riskPosture', isReverseCoded: false },
  { key: 'q13', text: 'I know how to structure prompts to get useful results from AI tools.', traitKey: 'capability', isReverseCoded: false },
  { key: 'q14', text: 'I can usually detect when AI-generated information is inaccurate or misleading.', traitKey: 'capability', isReverseCoded: false },
  { key: 'q15', text: 'I understand, at a high level, how AI systems generate outputs.', traitKey: 'capability', isReverseCoded: false },
  { key: 'q16', text: 'I sometimes rely on AI results without fully understanding them.', traitKey: 'capability', isReverseCoded: true },
  { key: 'q17', text: 'I know where my AI skills are strong and where I need development.', traitKey: 'capability', isReverseCoded: false },
  { key: 'q18', text: 'I can combine AI outputs with my own expertise to improve final outcomes.', traitKey: 'capability', isReverseCoded: false },
]

const AI_AXIS_CONTENT: Record<AiAxisKey, { label: string; description: string }> = {
  openness: {
    label: 'Openness to AI',
    description: 'Willingness and energy to engage with AI in practical work.',
  },
  riskPosture: {
    label: 'Risk Posture',
    description: 'Judgement and verification discipline when using AI outputs.',
  },
  capability: {
    label: 'Capability',
    description: 'Practical fluency and confidence using AI in role-relevant work.',
  },
}

function cloneBandingsAcrossLevels(config: V2ScoringConfig) {
  const duplicated: V2BandingConfig[] = []

  for (const banding of config.bandings) {
    for (const level of ['trait', 'competency', 'dimension'] as const) {
      duplicated.push({
        level,
        targetKey: banding.targetKey,
        bands: banding.bands.map((band) => ({ ...band })),
      })
    }
  }

  return normalizeV2ScoringConfig({
    ...config,
    bandings: duplicated,
  })
}

export function createAiReadinessV2QuestionBank(): V2QuestionBank {
  const bank = createEmptyV2QuestionBank()

  return {
    ...bank,
    dimensions: Object.entries(AI_AXIS_CONTENT).map(([key, value]) => ({
      id: `dimension_${key}`,
      key,
      internalName: value.label,
      externalName: value.label,
      definition: value.description,
    })),
    competencies: Object.entries(AI_AXIS_CONTENT).map(([key, value]) => ({
      id: `competency_${key}`,
      key,
      internalName: value.label,
      externalName: value.label,
      definition: value.description,
      dimensionKeys: [key],
    })),
    traits: Object.entries(AI_AXIS_CONTENT).map(([key, value]) => ({
      id: `trait_${key}`,
      key,
      internalName: value.label,
      externalName: value.label,
      definition: value.description,
      competencyKeys: [key],
    })),
    scoredItems: AI_READINESS_ITEMS.map((item, index) => ({
      id: `item_${item.key}`,
      key: item.key,
      text: item.text,
      traitKey: item.traitKey,
      isReverseCoded: item.isReverseCoded,
      weight: 1,
    })),
  }
}

export function createAiReadinessV2ScoringConfig(): V2ScoringConfig {
  const base = withAiOrientationDerivedOutcomeSeed(createEmptyV2ScoringConfig())
  return cloneBandingsAcrossLevels(base)
}

export function createAiReadinessV2ExperienceConfig(): AssessmentV2ExperienceConfig {
  return {
    ...DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG,
    openingBlocks: DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.openingBlocks.map((block) => {
      if (block.type === 'essentials') {
        return {
          ...block,
          title: 'Assessment essentials',
          items: block.items.map((item) => {
            if (item.kind === 'outcome') {
              return {
                ...item,
                value: 'A clear profile across openness, risk posture, and capability, plus practical next steps.',
              }
            }
            return item
          }),
        }
      }

      if (block.type === 'trust_note') {
        return {
          ...block,
          title: 'A focused AI readiness assessment',
          body: 'Answer from your current reality so the final profile reflects how you actually work with AI today.',
        }
      }

      return block
    }),
    finalisingKicker: 'Finalising AI readiness profile',
    finalisingTitle: 'Generating your AI readiness profile',
    finalisingBody: 'We are scoring your responses across openness, risk posture, and capability now.',
    finalisingStatusLabel: 'Generating profile',
  }
}

export function createAiReadinessV2ReportTemplate(): V2ReportTemplateDefinition {
  return {
    version: 1,
    name: 'AI Readiness Candidate Report',
    description: 'Default V2 candidate report for the AI Readiness assessment.',
    global: {
      pdf_enabled: true,
      layer_labels: {
        dimensions: 'Capability areas',
        competencies: 'Capability areas',
        traits: 'Capability areas',
      },
    },
    blocks: [
      {
        id: 'overall_profile',
        source: 'derived_outcome',
        format: 'hero_card',
        content: {
          eyebrow: 'AI Readiness',
          title: 'Your overall profile',
        },
        enabled: true,
      },
      {
        id: 'dimension_scores',
        source: 'dimension_scores',
        format: 'score_cards',
        content: {
          title: 'Core readiness competencies',
        },
        enabled: true,
      },
      {
        id: 'narrative_insights',
        source: 'interpretations',
        format: 'insight_list',
        content: {
          title: 'Narrative insights',
        },
        enabled: true,
      },
      {
        id: 'recommendations',
        source: 'recommendations',
        format: 'bullet_list',
        content: {
          title: 'Development recommendations',
        },
        enabled: true,
      },
      {
        id: 'about_report',
        source: 'static_content',
        format: 'rich_text',
        content: {
          title: 'About this report',
          body_markdown: 'This profile reflects your current readiness to use AI effectively, responsibly, and with practical impact across openness, risk posture, and capability.',
        },
        enabled: true,
      },
    ],
  }
}
