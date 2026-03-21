import type { V2BlockDataSource } from '@/utils/assessments/assessment-report-template'

type PreviewScoreItem = {
  key: string
  label: string
  value: number
  band: string
}

type PreviewTextItem = {
  key: string
  label: string
  description: string
}

export type V2PreviewSample = {
  id: string
  personName: string
  email?: string
  role: string
  organisation: string
  reportTitle: string
  reportSubtitle: string
  classification: {
    key: string
    label: string
    description: string
  }
  dimension_scores: PreviewScoreItem[]
  competency_scores: PreviewScoreItem[]
  trait_scores: PreviewScoreItem[]
  interpretations: PreviewTextItem[]
  recommendations: PreviewTextItem[]
  static_content: string
}

export const V2_PREVIEW_SAMPLES: V2PreviewSample[] = [
  {
    id: 'ai_orientation_sample',
    personName: 'Alex Morgan',
    email: 'alex.morgan@lq-sample.internal',
    role: 'People Operations Manager',
    organisation: 'Northshore Group',
    reportTitle: 'AI readiness profile',
    reportSubtitle: 'Consistent engagement emerging, with judgement routines and capability still building.',
    classification: {
      key: 'developing_operator',
      label: 'Developing Operator',
      description: 'Shows some readiness, but still needs balanced development across the model.',
    },
    dimension_scores: [
      { key: 'openness', label: 'Openness to AI', value: 67, band: 'Conditional Adopter' },
      { key: 'riskPosture', label: 'Risk Posture', value: 58, band: 'Moderate Awareness' },
      { key: 'capability', label: 'Capability', value: 61, band: 'Developing' },
    ],
    competency_scores: [],
    trait_scores: [
      { key: 'curiosity', label: 'Curiosity', value: 67, band: 'Conditional Adopter' },
      { key: 'judgement', label: 'Judgement', value: 58, band: 'Moderate Awareness' },
      { key: 'skill', label: 'Skill', value: 61, band: 'Developing' },
    ],
    interpretations: [
      {
        key: 'interp_1',
        label: 'Consistent engagement emerging',
        description: 'Alex actively uses AI tools day-to-day, showing solid baseline engagement and a willingness to experiment.',
      },
      {
        key: 'interp_2',
        label: 'Judgement routines need strengthening',
        description: 'Risk and verification habits are not yet consistent, creating some exposure in sensitive or high-stakes workflows.',
      },
      {
        key: 'interp_3',
        label: 'Capability is building',
        description: 'Practical skills are functional but would benefit from deliberate practice, especially in more complex or ambiguous use cases.',
      },
    ],
    recommendations: [
      {
        key: 'rec_1',
        label: 'Build a verification habit',
        description: 'Create a short personal checklist for reviewing AI outputs — covering accuracy, privacy, and decision quality — before using them in important work.',
      },
      {
        key: 'rec_2',
        label: 'Push into one stretch workflow',
        description: 'Choose a more complex workflow and use it deliberately to build capability. Document what works and what does not.',
      },
      {
        key: 'rec_3',
        label: 'Learn from capable peers',
        description: 'Observe how colleagues who use AI well integrate it into their work, and borrow the patterns that fit your context best.',
      },
    ],
    static_content: 'Sample profile generated for V2 report builder preview.',
  },
  {
    id: 'jordan_sample',
    personName: 'Jordan Ellis',
    email: 'jordan.ellis@lq-sample.internal',
    role: 'Head of Strategy',
    organisation: 'Apex Digital',
    reportTitle: 'AI readiness profile',
    reportSubtitle: 'Strong readiness across all axes — a well-rounded AI practitioner with established responsible-use habits.',
    classification: {
      key: 'ai_ready_operator',
      label: 'AI Ready Operator',
      description: 'Demonstrates strong readiness across all three axes of the model.',
    },
    dimension_scores: [
      { key: 'openness', label: 'Openness to AI', value: 88, band: 'Early Adopter' },
      { key: 'riskPosture', label: 'Risk Posture', value: 82, band: 'Calibrated & Risk-Aware' },
      { key: 'capability', label: 'Capability', value: 85, band: 'Confident & Skilled' },
    ],
    competency_scores: [],
    trait_scores: [
      { key: 'curiosity', label: 'Curiosity', value: 88, band: 'Early Adopter' },
      { key: 'judgement', label: 'Judgement', value: 82, band: 'Calibrated & Risk-Aware' },
      { key: 'skill', label: 'Skill', value: 85, band: 'Confident & Skilled' },
    ],
    interpretations: [
      {
        key: 'interp_1',
        label: 'Strong readiness across all axes',
        description: 'Jordan demonstrates high scores across openness, risk posture, and capability — a genuinely well-rounded AI practitioner.',
      },
      {
        key: 'interp_2',
        label: 'Risk posture is a genuine strength',
        description: 'Verification and responsible-use habits are well established and applied consistently, even under time pressure.',
      },
      {
        key: 'interp_3',
        label: 'Capability converts into real output',
        description: 'Practical fluency is high and translates directly into measurable quality and efficiency improvements.',
      },
    ],
    recommendations: [
      {
        key: 'rec_1',
        label: 'Lead a peer learning session',
        description: 'Share your strongest workflows and prompt patterns with the team to scale responsible AI capability across the organisation.',
      },
      {
        key: 'rec_2',
        label: 'Document edge cases and failure modes',
        description: 'Capture the scenarios where AI falls short and how you handle them. This helps the whole team build resilience.',
      },
      {
        key: 'rec_3',
        label: 'Identify a high-ambiguity stretch challenge',
        description: 'Find a complex, ambiguous problem where AI can support but not replace your judgement, and push deliberately into it.',
      },
    ],
    static_content: 'Sample profile generated for V2 report builder preview.',
  },
  {
    id: 'priya_sample',
    personName: 'Priya Sharma',
    email: 'priya.sharma@lq-sample.internal',
    role: 'Senior Consultant',
    organisation: 'Meridian Partners',
    reportTitle: 'AI readiness profile',
    reportSubtitle: 'High enthusiasm for AI but with underdeveloped risk awareness and verification habits.',
    classification: {
      key: 'naive_enthusiast',
      label: 'Naive Enthusiast',
      description: 'High enthusiasm for AI but with underdeveloped risk awareness and verification habits.',
    },
    dimension_scores: [
      { key: 'openness', label: 'Openness to AI', value: 91, band: 'Early Adopter' },
      { key: 'riskPosture', label: 'Risk Posture', value: 34, band: 'Blind Trust or Low Risk Sensitivity' },
      { key: 'capability', label: 'Capability', value: 68, band: 'Developing' },
    ],
    competency_scores: [],
    trait_scores: [
      { key: 'curiosity', label: 'Curiosity', value: 91, band: 'Early Adopter' },
      { key: 'judgement', label: 'Judgement', value: 34, band: 'Blind Trust or Low Risk Sensitivity' },
      { key: 'skill', label: 'Skill', value: 68, band: 'Developing' },
    ],
    interpretations: [
      {
        key: 'interp_1',
        label: 'Enthusiasm is a real asset',
        description: 'Priya is highly motivated to use AI and engages quickly when new tools or applications are visible — energy that can drive team adoption.',
      },
      {
        key: 'interp_2',
        label: 'Risk awareness needs deliberate development',
        description: 'Current habits do not include enough verification or consideration of privacy and accuracy risks before using AI outputs in practice.',
      },
      {
        key: 'interp_3',
        label: 'Capability is building ahead of governance',
        description: 'Skills are functional and improving, but the pace of adoption is currently outrunning the judgement routines needed to use AI responsibly.',
      },
    ],
    recommendations: [
      {
        key: 'rec_1',
        label: 'Build a personal verification checklist',
        description: 'Before using AI outputs in important work, apply a short set of quality, accuracy, and privacy checks to catch issues before they matter.',
      },
      {
        key: 'rec_2',
        label: 'Slow down on high-stakes use cases',
        description: 'For decisions that affect people or require accuracy, apply more scrutiny to AI-generated content before acting on it.',
      },
      {
        key: 'rec_3',
        label: 'Match enthusiasm with process',
        description: 'Your appetite for AI is a genuine strength. Pair it with a consistent approach to responsible use so that speed does not introduce risk.',
      },
    ],
    static_content: 'Sample profile generated for V2 report builder preview.',
  },
]

export function getV2PreviewSample(sampleId?: string | null) {
  return V2_PREVIEW_SAMPLES.find((sample) => sample.id === sampleId) ?? V2_PREVIEW_SAMPLES[0]!
}

export function getV2PreviewItems(
  sampleId: string | null | undefined,
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content'>
) {
  if (source === 'archetype_profile') return []
  const sample = getV2PreviewSample(sampleId)
  return (sample[source as Exclude<keyof V2PreviewSample, 'id' | 'personName' | 'email' | 'role' | 'organisation' | 'reportTitle' | 'reportSubtitle' | 'classification' | 'static_content'>] as any) ?? []
}
