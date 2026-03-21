import type { RunnerConfig } from '@/utils/assessments/experience-config'

export type AssessmentExperienceEssentialItemKind = 'time' | 'format' | 'outcome' | 'custom'

export type AssessmentExperienceEssentialItem = {
  id: string
  kind: AssessmentExperienceEssentialItemKind
  label: string
  value: string
}

export type AssessmentExperienceExpectationItem = {
  id: string
  title: string
  body: string
}

export type AssessmentExperienceBlock =
  | {
      id: string
      type: 'essentials'
      title: string
      items: AssessmentExperienceEssentialItem[]
    }
  | {
      id: string
      type: 'expectation_flow'
      title: string
      items: AssessmentExperienceExpectationItem[]
    }
  | {
      id: string
      type: 'trust_note'
      eyebrow: string
      title: string
      body: string
    }

export type AssessmentExperienceConfig = {
  schemaVersion: 1
  openingBlocks: AssessmentExperienceBlock[]
  finalisingKicker: string
  finalisingTitle: string
  finalisingBody: string
  finalisingStatusLabel: string
  questionIntroEyebrow: string
  questionIntroTitle: string
  questionIntroBody: string
}

type UnknownObject = Record<string, unknown>

export const DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG: AssessmentExperienceConfig = {
  schemaVersion: 1,
  openingBlocks: [],
  finalisingKicker: '',
  finalisingTitle: 'Submitting your responses',
  finalisingBody: '',
  finalisingStatusLabel: 'Submitting',
  questionIntroEyebrow: '',
  questionIntroTitle: '',
  questionIntroBody: '',
}

/**
 * Rich default blocks — available via the campaign experience editor
 * when adding blocks to a new campaign experience.
 */
export const RICH_OPENING_BLOCKS: AssessmentExperienceBlock[] = [
  {
    id: 'essentials',
    type: 'essentials',
    title: 'Assessment essentials',
    items: [
      {
        id: 'essentials-time',
        kind: 'time',
        label: 'Time',
        value: '',
      },
      {
        id: 'essentials-format',
        kind: 'format',
        label: 'Format',
        value: 'One prompt at a time with a simple five-point scale.',
      },
      {
        id: 'essentials-outcome',
        kind: 'outcome',
        label: 'Outcome',
        value: 'A clear snapshot of your current profile and practical next steps.',
      },
    ],
  },
  {
    id: 'expectation-flow',
    type: 'expectation_flow',
    title: 'What to expect',
    items: [
      {
        id: 'expectation-1',
        title: 'Answer from your current reality',
        body: 'Respond based on how you work today rather than how you hope things will look in the future.',
      },
      {
        id: 'expectation-2',
        title: 'Move at a steady pace',
        body: 'The assessment is designed to feel quick and focused, so you can stay in flow from start to finish.',
      },
      {
        id: 'expectation-3',
        title: 'Finish with a clear next step',
        body: 'Once you submit, we prepare the next step immediately so you can keep momentum.',
      },
    ],
  },
  {
    id: 'trust-note',
    type: 'trust_note',
    eyebrow: 'Before you begin',
    title: 'A clean, focused assessment experience',
    body: 'Take a few quiet minutes, answer honestly, and use the prompts as they are written. The best results come from direct answers rather than overthinking each statement.',
  },
]

const DEFAULT_ESSENTIALS_BLOCK = RICH_OPENING_BLOCKS[0] as Extract<
  AssessmentExperienceBlock,
  { type: 'essentials' }
>
const DEFAULT_EXPECTATION_FLOW_BLOCK = RICH_OPENING_BLOCKS[1] as Extract<
  AssessmentExperienceBlock,
  { type: 'expectation_flow' }
>
const DEFAULT_TRUST_NOTE_BLOCK = RICH_OPENING_BLOCKS[2] as Extract<
  AssessmentExperienceBlock,
  { type: 'trust_note' }
>

function isObject(value: unknown): value is UnknownObject {
  return typeof value === 'object' && value !== null
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeOptionalText(value: unknown, fallback: string) {
  if (typeof value === 'string') return value.trim()
  return fallback
}

function normalizeId(value: unknown, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

function normalizeEssentialItem(
  value: unknown,
  fallback: AssessmentExperienceEssentialItem,
  index: number
): AssessmentExperienceEssentialItem {
  if (!isObject(value)) {
    return { ...fallback, id: `${fallback.id}-${index}` }
  }

  const kind = value.kind === 'time' || value.kind === 'format' || value.kind === 'outcome' || value.kind === 'custom'
    ? value.kind
    : fallback.kind

  return {
    id: normalizeId(value.id, `${fallback.id}-${index}`),
    kind,
    label: normalizeText(value.label, fallback.label),
    value: typeof value.value === 'string' ? value.value.trim() : fallback.value,
  }
}

function normalizeExpectationItem(
  value: unknown,
  fallback: AssessmentExperienceExpectationItem,
  index: number
): AssessmentExperienceExpectationItem {
  if (!isObject(value)) {
    return { ...fallback, id: `${fallback.id}-${index}` }
  }

  return {
    id: normalizeId(value.id, `${fallback.id}-${index}`),
    title: normalizeText(value.title, fallback.title),
    body: normalizeText(value.body, fallback.body),
  }
}

function normalizeBlock(
  value: unknown,
  fallback: AssessmentExperienceBlock,
  index: number
): AssessmentExperienceBlock {
  if (!isObject(value) || typeof value.type !== 'string') {
    return { ...fallback, id: `${fallback.id}-${index}` }
  }

  if (value.type === 'essentials') {
    const fallbackItems = fallback.type === 'essentials' ? fallback.items : DEFAULT_ESSENTIALS_BLOCK.items
    const rawItems = Array.isArray(value.items) ? value.items : fallbackItems
    const items: AssessmentExperienceEssentialItem[] = rawItems.slice(0, 6).map((item, itemIndex) =>
      normalizeEssentialItem(
        item,
        fallbackItems[itemIndex] ?? fallbackItems[fallbackItems.length - 1],
        itemIndex
      )
    )

    return {
      id: normalizeId(value.id, `essentials-${index}`),
      type: 'essentials',
      title: normalizeText(value.title, fallback.type === 'essentials' ? fallback.title : 'Assessment essentials'),
      items: items.length > 0 ? items : fallbackItems,
    }
  }

  if (value.type === 'expectation_flow') {
    const fallbackItems = fallback.type === 'expectation_flow' ? fallback.items : DEFAULT_EXPECTATION_FLOW_BLOCK.items
    const rawItems = Array.isArray(value.items) ? value.items : fallbackItems
    const items: AssessmentExperienceExpectationItem[] = rawItems.slice(0, 6).map((item, itemIndex) =>
      normalizeExpectationItem(
        item,
        fallbackItems[itemIndex] ?? fallbackItems[fallbackItems.length - 1],
        itemIndex
      )
    )

    return {
      id: normalizeId(value.id, `expectation-flow-${index}`),
      type: 'expectation_flow',
      title: normalizeText(value.title, fallback.type === 'expectation_flow' ? fallback.title : 'What to expect'),
      items: items.length > 0 ? items : fallbackItems,
    }
  }

  const trustFallback = fallback.type === 'trust_note' ? fallback : DEFAULT_TRUST_NOTE_BLOCK

  return {
    id: normalizeId(value.id, `trust-note-${index}`),
    type: 'trust_note',
    eyebrow: normalizeText(value.eyebrow, trustFallback.eyebrow),
    title: normalizeText(value.title, trustFallback.title),
    body: normalizeText(value.body, trustFallback.body),
  }
}


export function normalizeAssessmentExperienceConfig(value: unknown): AssessmentExperienceConfig {
  if (!isObject(value)) {
    return { ...DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG }
  }

  const rawBlocks = Array.isArray(value.openingBlocks) ? value.openingBlocks : []
  const richFallbackBlocks = RICH_OPENING_BLOCKS
  const openingBlocks = rawBlocks.slice(0, 8).map((block, index) =>
    normalizeBlock(block, richFallbackBlocks[index] ?? richFallbackBlocks[richFallbackBlocks.length - 1], index)
  )

  return {
    schemaVersion: 1,
    openingBlocks,
    finalisingKicker: normalizeOptionalText(value.finalisingKicker, DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG.finalisingKicker),
    finalisingTitle: normalizeText(value.finalisingTitle, DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG.finalisingTitle),
    finalisingBody: normalizeOptionalText(value.finalisingBody, DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG.finalisingBody),
    finalisingStatusLabel: normalizeText(value.finalisingStatusLabel, DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG.finalisingStatusLabel),
    questionIntroEyebrow: normalizeOptionalText(value.questionIntroEyebrow, DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG.questionIntroEyebrow),
    questionIntroTitle: normalizeOptionalText(value.questionIntroTitle, DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG.questionIntroTitle),
    questionIntroBody: normalizeOptionalText(value.questionIntroBody, DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG.questionIntroBody),
  }
}

export function getAssessmentExperienceConfig(sourceRunnerConfig: unknown): AssessmentExperienceConfig {
  if (!isObject(sourceRunnerConfig) || !('v2_experience' in sourceRunnerConfig)) {
    return normalizeAssessmentExperienceConfig(null)
  }

  return normalizeAssessmentExperienceConfig(sourceRunnerConfig.v2_experience)
}

export const MINIMAL_ASSESSMENT_V2_EXPERIENCE_CONFIG: AssessmentExperienceConfig = {
  schemaVersion: 1,
  openingBlocks: [],
  finalisingKicker: '',
  finalisingTitle: 'Submitting your responses',
  finalisingBody: '',
  finalisingStatusLabel: 'Submitting',
  questionIntroEyebrow: '',
  questionIntroTitle: '',
  questionIntroBody: '',
}

export function getCampaignV2ExperienceConfig(
  campaignRunnerOverrides: unknown,
  assessmentRunnerConfig: unknown
): AssessmentExperienceConfig {
  if (isObject(campaignRunnerOverrides) && 'v2_experience' in campaignRunnerOverrides) {
    return normalizeAssessmentExperienceConfig(campaignRunnerOverrides.v2_experience)
  }
  return getAssessmentExperienceConfig(assessmentRunnerConfig)
}

export function withAssessmentExperienceConfig(
  sourceRunnerConfig: unknown,
  runnerConfig: RunnerConfig,
  experienceConfig: AssessmentExperienceConfig
) {
  const base = isObject(sourceRunnerConfig) ? sourceRunnerConfig : {}

  return {
    ...base,
    ...runnerConfig,
    v2_experience: normalizeAssessmentExperienceConfig(experienceConfig),
  }
}
