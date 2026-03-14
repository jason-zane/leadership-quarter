import type { RunnerConfig } from '@/utils/assessments/experience-config'

export type AssessmentV2ExperienceEssentialItemKind = 'time' | 'format' | 'outcome' | 'custom'

export type AssessmentV2ExperienceEssentialItem = {
  id: string
  kind: AssessmentV2ExperienceEssentialItemKind
  label: string
  value: string
}

export type AssessmentV2ExperienceExpectationItem = {
  id: string
  title: string
  body: string
}

export type AssessmentV2ExperienceBlock =
  | {
      id: string
      type: 'essentials'
      title: string
      items: AssessmentV2ExperienceEssentialItem[]
    }
  | {
      id: string
      type: 'expectation_flow'
      title: string
      items: AssessmentV2ExperienceExpectationItem[]
    }
  | {
      id: string
      type: 'trust_note'
      eyebrow: string
      title: string
      body: string
    }

export type AssessmentV2ExperienceConfig = {
  schemaVersion: 1
  openingBlocks: AssessmentV2ExperienceBlock[]
  finalisingKicker: string
  finalisingTitle: string
  finalisingBody: string
  finalisingStatusLabel: string
  questionIntroEyebrow: string
  questionIntroTitle: string
  questionIntroBody: string
}

type UnknownObject = Record<string, unknown>

export const DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG: AssessmentV2ExperienceConfig = {
  schemaVersion: 1,
  openingBlocks: [
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
  ],
  finalisingKicker: 'Finalising assessment',
  finalisingTitle: 'Generating your results',
  finalisingBody: 'We are scoring your responses and preparing the next step now.',
  finalisingStatusLabel: 'Generating results',
  questionIntroEyebrow: 'In progress',
  questionIntroTitle: 'Choose the response that best reflects your current experience.',
  questionIntroBody: 'There are no right answers. The most useful results come from consistent, honest responses.',
}

const DEFAULT_ESSENTIALS_BLOCK = DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.openingBlocks[0] as Extract<
  AssessmentV2ExperienceBlock,
  { type: 'essentials' }
>
const DEFAULT_EXPECTATION_FLOW_BLOCK = DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.openingBlocks[1] as Extract<
  AssessmentV2ExperienceBlock,
  { type: 'expectation_flow' }
>
const DEFAULT_TRUST_NOTE_BLOCK = DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.openingBlocks[2] as Extract<
  AssessmentV2ExperienceBlock,
  { type: 'trust_note' }
>

function isObject(value: unknown): value is UnknownObject {
  return typeof value === 'object' && value !== null
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeId(value: unknown, fallback: string) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

function normalizeEssentialItem(
  value: unknown,
  fallback: AssessmentV2ExperienceEssentialItem,
  index: number
): AssessmentV2ExperienceEssentialItem {
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
  fallback: AssessmentV2ExperienceExpectationItem,
  index: number
): AssessmentV2ExperienceExpectationItem {
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
  fallback: AssessmentV2ExperienceBlock,
  index: number
): AssessmentV2ExperienceBlock {
  if (!isObject(value) || typeof value.type !== 'string') {
    return { ...fallback, id: `${fallback.id}-${index}` }
  }

  if (value.type === 'essentials') {
    const fallbackItems = fallback.type === 'essentials' ? fallback.items : DEFAULT_ESSENTIALS_BLOCK.items
    const rawItems = Array.isArray(value.items) ? value.items : fallbackItems
    const items: AssessmentV2ExperienceEssentialItem[] = rawItems.slice(0, 6).map((item, itemIndex) =>
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
    const items: AssessmentV2ExperienceExpectationItem[] = rawItems.slice(0, 6).map((item, itemIndex) =>
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

function getDefaultBlocks() {
  return [
    {
      ...DEFAULT_ESSENTIALS_BLOCK,
      items: DEFAULT_ESSENTIALS_BLOCK.items.map((item) => ({ ...item })),
    },
    {
      ...DEFAULT_EXPECTATION_FLOW_BLOCK,
      items: DEFAULT_EXPECTATION_FLOW_BLOCK.items.map((item) => ({ ...item })),
    },
    {
      ...DEFAULT_TRUST_NOTE_BLOCK,
    },
  ] satisfies AssessmentV2ExperienceBlock[]
}

export function normalizeAssessmentV2ExperienceConfig(value: unknown): AssessmentV2ExperienceConfig {
  if (!isObject(value)) {
    return {
      ...DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG,
      openingBlocks: getDefaultBlocks(),
    }
  }

  const rawBlocks = Array.isArray(value.openingBlocks)
    ? value.openingBlocks
    : DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.openingBlocks
  const fallbackBlocks = DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.openingBlocks
  const openingBlocks = rawBlocks.slice(0, 8).map((block, index) =>
    normalizeBlock(block, fallbackBlocks[index] ?? fallbackBlocks[fallbackBlocks.length - 1], index)
  )

  return {
    schemaVersion: 1,
    openingBlocks: openingBlocks.length > 0 ? openingBlocks : getDefaultBlocks(),
    finalisingKicker: normalizeText(value.finalisingKicker, DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.finalisingKicker),
    finalisingTitle: normalizeText(value.finalisingTitle, DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.finalisingTitle),
    finalisingBody: normalizeText(value.finalisingBody, DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.finalisingBody),
    finalisingStatusLabel: normalizeText(value.finalisingStatusLabel, DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.finalisingStatusLabel),
    questionIntroEyebrow: normalizeText(value.questionIntroEyebrow, DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.questionIntroEyebrow),
    questionIntroTitle: normalizeText(value.questionIntroTitle, DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.questionIntroTitle),
    questionIntroBody: normalizeText(value.questionIntroBody, DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG.questionIntroBody),
  }
}

export function getAssessmentV2ExperienceConfig(sourceRunnerConfig: unknown): AssessmentV2ExperienceConfig {
  if (!isObject(sourceRunnerConfig) || !('v2_experience' in sourceRunnerConfig)) {
    return normalizeAssessmentV2ExperienceConfig(null)
  }

  return normalizeAssessmentV2ExperienceConfig(sourceRunnerConfig.v2_experience)
}

export function withAssessmentV2ExperienceConfig(
  sourceRunnerConfig: unknown,
  runnerConfig: RunnerConfig,
  experienceConfig: AssessmentV2ExperienceConfig
) {
  const base = isObject(sourceRunnerConfig) ? sourceRunnerConfig : {}

  return {
    ...base,
    ...runnerConfig,
    v2_experience: normalizeAssessmentV2ExperienceConfig(experienceConfig),
  }
}
