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

export type AssessmentExperienceSubCard = {
  id: string
  eyebrow: string
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
  | {
      id: string
      type: 'card_grid_block'
      eyebrow: string
      title: string
      description: string
      cards: AssessmentExperienceSubCard[]
    }
  | {
      id: string
      type: 'feature_card'
      eyebrow: string
      title: string
      body: string
      cta_label: string
      cta_href: string
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
  openingBlocks: [
    {
      id: 'essentials',
      type: 'card_grid_block',
      eyebrow: 'Essentials',
      title: 'Assessment essentials',
      description: '',
      cards: [
        { id: 'essentials-time', eyebrow: 'Time', title: '', body: 'A short, focused assessment you can complete in one sitting.' },
        { id: 'essentials-format', eyebrow: 'Format', title: '', body: 'One prompt at a time with a simple five-point scale.' },
        { id: 'essentials-outcome', eyebrow: 'Outcome', title: '', body: 'A clear snapshot of your current profile and practical next steps.' },
      ],
    },
    {
      id: 'expectation-flow',
      type: 'card_grid_block',
      eyebrow: 'What to expect',
      title: '',
      description: '',
      cards: [
        {
          id: 'expectation-1',
          eyebrow: '01',
          title: 'Answer from your current reality',
          body: 'Respond based on how you work today rather than how you hope things will look in the future.',
        },
        {
          id: 'expectation-2',
          eyebrow: '02',
          title: 'Move at a steady pace',
          body: 'The assessment is designed to feel quick and focused, so you can stay in flow from start to finish.',
        },
        {
          id: 'expectation-3',
          eyebrow: '03',
          title: 'Finish with a clear next step',
          body: 'Once you submit, we prepare the next step immediately so you can keep momentum.',
        },
      ],
    },
    {
      id: 'trust-note',
      type: 'feature_card',
      eyebrow: 'Before you begin',
      title: 'A clean, focused assessment experience',
      body: 'Take a few quiet minutes, answer honestly, and use the prompts as they are written. The best results come from direct answers rather than overthinking each statement.',
      cta_label: '',
      cta_href: '',
    },
  ],
  finalisingKicker: '',
  finalisingTitle: 'Submitting your responses',
  finalisingBody: '',
  finalisingStatusLabel: 'Generating results',
  questionIntroEyebrow: '',
  questionIntroTitle: '',
  questionIntroBody: '',
}

/**
 * Rich default blocks — available via the campaign experience editor
 * when adding blocks to a new campaign experience.
 */
export const RICH_OPENING_BLOCKS: AssessmentExperienceBlock[] = DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG.openingBlocks

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

function normalizeSubCard(
  value: unknown,
  index: number
): AssessmentExperienceSubCard {
  if (!isObject(value)) {
    return { id: `subcard-${index}`, eyebrow: '', title: '', body: '' }
  }

  return {
    id: normalizeId(value.id, `subcard-${index}`),
    eyebrow: typeof value.eyebrow === 'string' ? value.eyebrow.trim() : '',
    title: typeof value.title === 'string' ? value.title.trim() : '',
    body: typeof value.body === 'string' ? value.body.trim() : '',
  }
}

function normalizeEssentialItem(
  value: unknown,
  index: number
): AssessmentExperienceEssentialItem {
  const fallback: AssessmentExperienceEssentialItem = { id: `item-${index}`, kind: 'custom', label: '', value: '' }
  if (!isObject(value)) return fallback

  const kind = value.kind === 'time' || value.kind === 'format' || value.kind === 'outcome' || value.kind === 'custom'
    ? value.kind
    : 'custom'

  return {
    id: normalizeId(value.id, `item-${index}`),
    kind,
    label: typeof value.label === 'string' ? value.label.trim() : '',
    value: typeof value.value === 'string' ? value.value.trim() : '',
  }
}

function normalizeExpectationItem(
  value: unknown,
  index: number
): AssessmentExperienceExpectationItem {
  const fallback: AssessmentExperienceExpectationItem = { id: `expectation-${index}`, title: '', body: '' }
  if (!isObject(value)) return fallback

  return {
    id: normalizeId(value.id, `expectation-${index}`),
    title: typeof value.title === 'string' ? value.title.trim() : '',
    body: typeof value.body === 'string' ? value.body.trim() : '',
  }
}

function migrateEssentialsToCardGrid(value: UnknownObject, index: number): Extract<AssessmentExperienceBlock, { type: 'card_grid_block' }> {
  const rawItems = Array.isArray(value.items) ? value.items : []
  const cards: AssessmentExperienceSubCard[] = rawItems.slice(0, 6).map((item, itemIndex) => {
    const normalized = normalizeEssentialItem(item, itemIndex)
    return {
      id: normalized.id,
      eyebrow: normalized.label,
      title: '',
      body: normalized.value,
    }
  })

  return {
    id: normalizeId(value.id, `card-grid-${index}`),
    type: 'card_grid_block',
    eyebrow: 'Essentials',
    title: typeof value.title === 'string' ? value.title.trim() : 'Assessment essentials',
    description: '',
    cards: cards.length > 0 ? cards : [{ id: `subcard-0`, eyebrow: '', title: '', body: '' }],
  }
}

function migrateExpectationFlowToCardGrid(value: UnknownObject, index: number): Extract<AssessmentExperienceBlock, { type: 'card_grid_block' }> {
  const rawItems = Array.isArray(value.items) ? value.items : []
  const cards: AssessmentExperienceSubCard[] = rawItems.slice(0, 6).map((item, itemIndex) => {
    const normalized = normalizeExpectationItem(item, itemIndex)
    return {
      id: normalized.id,
      eyebrow: `0${itemIndex + 1}`,
      title: normalized.title,
      body: normalized.body,
    }
  })

  return {
    id: normalizeId(value.id, `card-grid-${index}`),
    type: 'card_grid_block',
    eyebrow: 'What to expect',
    title: typeof value.title === 'string' ? value.title.trim() : 'What to expect',
    description: '',
    cards: cards.length > 0 ? cards : [{ id: `subcard-0`, eyebrow: '', title: '', body: '' }],
  }
}

function migrateTrustNoteToFeatureCard(value: UnknownObject, index: number): Extract<AssessmentExperienceBlock, { type: 'feature_card' }> {
  return {
    id: normalizeId(value.id, `feature-card-${index}`),
    type: 'feature_card',
    eyebrow: typeof value.eyebrow === 'string' ? value.eyebrow.trim() : 'Before you begin',
    title: typeof value.title === 'string' ? value.title.trim() : '',
    body: typeof value.body === 'string' ? value.body.trim() : '',
    cta_label: '',
    cta_href: '',
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

  // Legacy: migrate essentials → card_grid_block
  if (value.type === 'essentials') {
    return migrateEssentialsToCardGrid(value, index)
  }

  // Legacy: migrate expectation_flow → card_grid_block
  if (value.type === 'expectation_flow') {
    return migrateExpectationFlowToCardGrid(value, index)
  }

  // Legacy: migrate trust_note → feature_card
  if (value.type === 'trust_note') {
    return migrateTrustNoteToFeatureCard(value, index)
  }

  // New type: card_grid_block
  if (value.type === 'card_grid_block') {
    const rawCards = Array.isArray(value.cards) ? value.cards : []
    const cards = rawCards.slice(0, 3).map((card, cardIndex) => normalizeSubCard(card, cardIndex))
    // Clamp to 1–3 cards
    const clampedCards = cards.length > 0
      ? cards
      : [{ id: `subcard-0`, eyebrow: '', title: '', body: '' }]

    return {
      id: normalizeId(value.id, `card-grid-${index}`),
      type: 'card_grid_block',
      eyebrow: typeof value.eyebrow === 'string' ? value.eyebrow.trim() : '',
      title: typeof value.title === 'string' ? value.title.trim() : '',
      description: typeof value.description === 'string' ? value.description.trim() : '',
      cards: clampedCards,
    }
  }

  // New type: feature_card
  if (value.type === 'feature_card') {
    return {
      id: normalizeId(value.id, `feature-card-${index}`),
      type: 'feature_card',
      eyebrow: typeof value.eyebrow === 'string' ? value.eyebrow.trim() : '',
      title: typeof value.title === 'string' ? value.title.trim() : '',
      body: typeof value.body === 'string' ? value.body.trim() : '',
      cta_label: typeof value.cta_label === 'string' ? value.cta_label.trim() : '',
      cta_href: typeof value.cta_href === 'string' ? value.cta_href.trim() : '',
    }
  }

  // Unknown type — return fallback
  return { ...fallback, id: `${fallback.id}-${index}` }
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
