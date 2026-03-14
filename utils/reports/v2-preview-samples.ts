import type { V2BlockDataSource } from '@/utils/assessments/v2-report-template'

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
    role: 'People Operations Manager',
    organisation: 'Northshore Group',
    reportTitle: 'AI readiness profile',
    reportSubtitle: 'Strong curiosity and practical confidence, with risk awareness that still needs deliberate discipline.',
    classification: {
      key: 'developing_operator',
      label: 'Developing Operator',
      description: 'Shows some readiness, but still needs balanced development across the model.',
    },
    dimension_scores: [
      { key: 'openness', label: 'Openness to AI', value: 84, band: 'Early Adopter' },
      { key: 'riskPosture', label: 'Risk Posture', value: 68, band: 'Moderate Awareness' },
      { key: 'capability', label: 'Capability', value: 78, band: 'Confident & Skilled' },
    ],
    competency_scores: [],
    trait_scores: [
      { key: 'curiosity', label: 'Curiosity', value: 84, band: 'High' },
      { key: 'judgement', label: 'Judgement', value: 68, band: 'Moderate' },
      { key: 'skill', label: 'Skill', value: 78, band: 'High' },
    ],
    interpretations: [
      {
        key: 'interp_ai_1',
        label: 'Adoption energy is high',
        description: 'Alex is motivated to work with AI and is likely to engage quickly when the workflow benefit is visible.',
      },
      {
        key: 'interp_ai_2',
        label: 'Capability is already useful',
        description: 'Practical fluency is emerging well enough to create meaningful output quality and efficiency gains.',
      },
      {
        key: 'interp_ai_3',
        label: 'Judgement routines are the leverage point',
        description: 'The next lift comes from making verification and responsible-use habits more consistent.',
      },
    ],
    recommendations: [
      {
        key: 'rec_ai_1',
        label: 'Strengthen verification habits',
        description: 'Build a few repeatable checks for privacy, factual accuracy, and decision quality before using AI outputs in important work.',
      },
      {
        key: 'rec_ai_2',
        label: 'Turn experimentation into routines',
        description: 'Choose two or three role-specific workflows where AI use becomes deliberate and measurable rather than ad hoc.',
      },
      {
        key: 'rec_ai_3',
        label: 'Share what works',
        description: 'Document strong prompts and examples so responsible capability can spread through the team.',
      },
    ],
    static_content: 'AI orientation sample preview. Use this profile to inspect a three-axis derived outcome built from openness, risk posture, and capability.',
  },
  {
    id: 'simon_sample',
    personName: 'Simon Hart',
    role: 'Regional Operations Director',
    organisation: 'Northfield Services',
    reportTitle: 'Leadership profile report',
    reportSubtitle: 'Operationally strong, commercially grounded, and most effective when leading through structure.',
    classification: {
      key: 'steady_operator',
      label: 'Steady Operator',
      description: 'Strong delivery focus with high dependability, clear judgement, and a preference for structured execution.',
    },
    dimension_scores: [
      { key: 'delivery', label: 'Delivery', value: 82, band: 'High' },
      { key: 'judgement', label: 'Judgement', value: 76, band: 'High' },
      { key: 'influence', label: 'Influence', value: 63, band: 'Moderate' },
      { key: 'adaptability', label: 'Adaptability', value: 58, band: 'Moderate' },
    ],
    competency_scores: [
      { key: 'planning', label: 'Planning & control', value: 84, band: 'High' },
      { key: 'stakeholders', label: 'Stakeholder alignment', value: 66, band: 'Moderate' },
      { key: 'coaching', label: 'Coaching others', value: 61, band: 'Moderate' },
      { key: 'change', label: 'Leading change', value: 57, band: 'Moderate' },
    ],
    trait_scores: [
      { key: 'discipline', label: 'Discipline', value: 86, band: 'High' },
      { key: 'reliability', label: 'Reliability', value: 81, band: 'High' },
      { key: 'assertiveness', label: 'Assertiveness', value: 64, band: 'Moderate' },
      { key: 'curiosity', label: 'Curiosity', value: 54, band: 'Moderate' },
      { key: 'calm', label: 'Calm under pressure', value: 79, band: 'High' },
      { key: 'flexibility', label: 'Flexibility', value: 52, band: 'Moderate' },
    ],
    interpretations: [
      {
        key: 'interp_1',
        label: 'Execution-led leadership',
        description: 'Simon is most credible when expectations are explicit, delivery pathways are clear, and accountability is visible.',
      },
      {
        key: 'interp_2',
        label: 'Measured change appetite',
        description: 'He can lead change successfully, but usually prefers change to be sequenced and justified rather than fast-moving and ambiguous.',
      },
      {
        key: 'interp_3',
        label: 'Practical stakeholder style',
        description: 'Relationships are strongest when discussions stay anchored in outcomes, trade-offs, and operational reality.',
      },
    ],
    recommendations: [
      {
        key: 'rec_1',
        label: 'Increase ambiguity tolerance',
        description: 'Build confidence in less-defined situations by running shorter test-and-learn cycles before formalising the full plan.',
      },
      {
        key: 'rec_2',
        label: 'Broaden influence style',
        description: 'Pair operational logic with a stronger narrative about direction, opportunity, and the human impact of decisions.',
      },
      {
        key: 'rec_3',
        label: 'Delegate earlier',
        description: 'Shift from quality control to coaching by handing off structure-setting and review ownership sooner.',
      },
    ],
    static_content: 'Simon sample preview. Use this profile when you want to inspect a steady, execution-heavy leadership pattern.',
  },
  {
    id: 'sam_sample',
    personName: 'Sam Patel',
    role: 'Product Strategy Lead',
    organisation: 'Aperture Labs',
    reportTitle: 'Leadership profile report',
    reportSubtitle: 'Strategic, inventive, and energised by possibility, with stronger performance when others stabilise execution detail.',
    classification: {
      key: 'adaptive_strategist',
      label: 'Adaptive Strategist',
      description: 'Strong conceptual range, future orientation, and problem reframing, with best results when paired with disciplined follow-through.',
    },
    dimension_scores: [
      { key: 'delivery', label: 'Delivery', value: 61, band: 'Moderate' },
      { key: 'judgement', label: 'Judgement', value: 74, band: 'High' },
      { key: 'influence', label: 'Influence', value: 81, band: 'High' },
      { key: 'adaptability', label: 'Adaptability', value: 88, band: 'High' },
    ],
    competency_scores: [
      { key: 'planning', label: 'Planning & control', value: 58, band: 'Moderate' },
      { key: 'stakeholders', label: 'Stakeholder alignment', value: 83, band: 'High' },
      { key: 'coaching', label: 'Coaching others', value: 77, band: 'High' },
      { key: 'change', label: 'Leading change', value: 86, band: 'High' },
    ],
    trait_scores: [
      { key: 'discipline', label: 'Discipline', value: 56, band: 'Moderate' },
      { key: 'reliability', label: 'Reliability', value: 63, band: 'Moderate' },
      { key: 'assertiveness', label: 'Assertiveness', value: 78, band: 'High' },
      { key: 'curiosity', label: 'Curiosity', value: 91, band: 'High' },
      { key: 'calm', label: 'Calm under pressure', value: 69, band: 'Moderate' },
      { key: 'flexibility', label: 'Flexibility', value: 89, band: 'High' },
    ],
    interpretations: [
      {
        key: 'interp_1',
        label: 'Opportunity-focused leadership',
        description: 'Sam naturally scans for emerging possibilities and often sees strategic pathways before the rest of the group does.',
      },
      {
        key: 'interp_2',
        label: 'High-change energy',
        description: 'Momentum is strongest in environments that reward experimentation, reframing, and iterative strategy development.',
      },
      {
        key: 'interp_3',
        label: 'Execution discipline is the watchpoint',
        description: 'Follow-through improves when implementation detail is translated into a few visible commitments rather than a large process framework.',
      },
    ],
    recommendations: [
      {
        key: 'rec_1',
        label: 'Tighten execution rhythms',
        description: 'Use two or three non-negotiable delivery checkpoints so ideas convert into visible progress more consistently.',
      },
      {
        key: 'rec_2',
        label: 'Clarify decision ownership',
        description: 'Reduce drift by naming who closes key decisions and what evidence is needed before momentum shifts again.',
      },
      {
        key: 'rec_3',
        label: 'Balance innovation with closure',
        description: 'Protect time for finishing and embedding existing priorities before opening the next strategic line of work.',
      },
    ],
    static_content: 'Sam sample preview. Use this profile when you want to inspect a high-adaptability, strategy-led pattern.',
  },
]

export function getV2PreviewSample(sampleId?: string | null) {
  return V2_PREVIEW_SAMPLES.find((sample) => sample.id === sampleId) ?? V2_PREVIEW_SAMPLES[0]!
}

export function getV2PreviewItems(
  sampleId: string | null | undefined,
  source: Exclude<V2BlockDataSource, 'overall_classification' | 'derived_outcome' | 'static_content'>
) {
  const sample = getV2PreviewSample(sampleId)
  return sample[source]
}
