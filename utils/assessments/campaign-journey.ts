import {
  applyCampaignRuntimeSafeguards,
  normalizeCampaignFlowStep,
  type CampaignConfig,
  type CampaignFlowStep,
  type CampaignScreenContentBlock,
} from '@/utils/assessments/campaign-types'
import {
  normalizeReportConfig,
  normalizeRunnerConfig,
  type ReportConfig,
  type RunnerConfig,
} from '@/utils/assessments/experience-config'
import {
  normalizeAssessmentExperienceConfig,
  type AssessmentExperienceBlock,
  type AssessmentExperienceConfig,
} from '@/utils/assessments/assessment-experience-config'

export type CampaignJourneyAssessmentStep = {
  id: string
  name: string
  externalName: string | null
  description: string | null
  status: string
}

export type CampaignJourneyFlowAssessment = {
  id: string
  campaign_assessment_id: string
  sort_order: number
  is_active: boolean
  assessments: CampaignJourneyAssessmentStep | null
}

export type CampaignJourneyResolvedPageType =
  | 'intro'
  | 'registration'
  | 'demographics'
  | 'assessment'
  | 'screen'
  | 'finalising'
  | 'completion'

export type CampaignJourneySystemScreenKey =
  | 'intro'
  | 'registration'
  | 'demographics'
  | 'finalising'
  | 'completion'

export type CampaignJourneyPageMovement = 'fixed' | 'journey_owned' | 'flow_step'

export type CampaignJourneyComposableScreenContent = {
  eyebrow: string
  title: string
  body: string
  ctaLabel: string
  ctaHref?: string
  blocks: CampaignScreenContentBlock[]
  identityHeading?: string
  identityDescription?: string
  demographicsHeading?: string
  demographicsDescription?: string
}

export type CampaignJourneySystemScreenContentConfig = {
  registration?: CampaignJourneyComposableScreenContent
  demographics?: CampaignJourneyComposableScreenContent
  completion?: CampaignJourneyComposableScreenContent
}

export type CampaignJourneyResolvedPage = {
  id: string
  type: CampaignJourneyResolvedPageType
  title: string
  description: string
  eyebrow: string
  ctaLabel: string | null
  ctaHref: string | null
  blocks: CampaignScreenContentBlock[]
  openingBlocks: AssessmentExperienceBlock[]
  source: 'campaign_config' | 'campaign_flow' | 'experience_config' | 'report_access'
  position: 'before' | 'core' | 'after'
  pageOrder: number
  movement: CampaignJourneyPageMovement
  systemKey?: CampaignJourneySystemScreenKey | null
  assessment?: CampaignJourneyAssessmentStep | null
  flowStep?: CampaignFlowStep | null
  identityHeading?: string
  identityDescription?: string
  demographicsHeading?: string
  demographicsDescription?: string
}

export type CampaignJourneyResolved = {
  runnerConfig: RunnerConfig
  reportConfig: ReportConfig
  experienceConfig: AssessmentExperienceConfig
  screenContent: CampaignJourneySystemScreenContentConfig
  pageOrder: string[]
  flowSteps: CampaignFlowStep[]
  pages: CampaignJourneyResolvedPage[]
}

type LegacyScreenCopy = {
  title?: string
  description?: string
  ctaLabelBefore?: string
  ctaLabelAfter?: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function normalizeScreenBlocks(value: unknown): CampaignScreenContentBlock[] {
  if (!Array.isArray(value)) return []

  return value
    .slice(0, 8)
    .map((block, index) => {
      if (!isObject(block)) {
        return {
          id: `block-${index + 1}`,
          type: 'rich_text',
          eyebrow: '',
          title: `Section ${index + 1}`,
          body: '',
          layout: 'stack',
        } satisfies CampaignScreenContentBlock
      }

      const id =
        typeof block.id === 'string' && block.id.trim().length > 0
          ? block.id.trim()
          : `block-${index + 1}`

      if (block.type === 'card_grid' || block.type === 'card_list') {
        const cards = Array.isArray(block.cards)
          ? block.cards.slice(0, 8).map((card, cardIndex) => {
            const rawCard = isObject(card) ? card : {}
            return {
              id:
                typeof rawCard.id === 'string' && rawCard.id.trim().length > 0
                  ? rawCard.id.trim()
                  : `card-${cardIndex + 1}`,
              title: normalizeText(rawCard.title, `Card ${cardIndex + 1}`),
              body: normalizeText(rawCard.body),
            }
          })
          : []

        const rawCardStyle = block.card_style
        const card_style =
          rawCardStyle === 'outlined' || rawCardStyle === 'filled' || rawCardStyle === 'glass'
            ? rawCardStyle
            : 'default' as const

        return {
          id,
          type: 'card_grid',
          eyebrow: normalizeText(block.eyebrow),
          title: normalizeText(block.title, `Section ${index + 1}`),
          body: normalizeText(block.body),
          columns: block.columns === 1 || block.columns === 3 ? block.columns : 2,
          cards,
          card_style,
        } satisfies CampaignScreenContentBlock
      }

      if (block.type === 'callout') {
        return {
          id,
          type: 'callout',
          eyebrow: normalizeText(block.eyebrow),
          title: normalizeText(block.title, `Callout ${index + 1}`),
          body: normalizeText(block.body),
          tone: block.tone === 'emphasis' ? 'emphasis' : 'neutral',
        } satisfies CampaignScreenContentBlock
      }

      return {
        id,
        type: 'rich_text',
        eyebrow: normalizeText(block.eyebrow),
        title: normalizeText(block.title, `Section ${index + 1}`),
        body: normalizeText(block.body),
        layout: block.layout === 'inline' ? 'inline' : 'stack',
      } satisfies CampaignScreenContentBlock
    })
}

function normalizeComposableScreenContent(
  value: unknown,
  fallback: Partial<CampaignJourneyComposableScreenContent> = {}
): CampaignJourneyComposableScreenContent {
  const raw = isObject(value) ? value : {}
  return {
    eyebrow: normalizeText(raw.eyebrow, fallback.eyebrow ?? ''),
    title: normalizeText(raw.title, fallback.title ?? ''),
    body: normalizeText(raw.body, fallback.body ?? ''),
    ctaLabel: normalizeText(raw.ctaLabel, fallback.ctaLabel ?? ''),
    ctaHref: normalizeText(raw.ctaHref, fallback.ctaHref ?? ''),
    blocks: normalizeScreenBlocks(raw.blocks ?? fallback.blocks),
    ...(typeof raw.identityHeading === 'string' && raw.identityHeading ? { identityHeading: raw.identityHeading } : {}),
    ...(typeof raw.identityDescription === 'string' && raw.identityDescription ? { identityDescription: raw.identityDescription } : {}),
    ...(typeof raw.demographicsHeading === 'string' && raw.demographicsHeading ? { demographicsHeading: raw.demographicsHeading } : {}),
    ...(typeof raw.demographicsDescription === 'string' && raw.demographicsDescription ? { demographicsDescription: raw.demographicsDescription } : {}),
  }
}

function normalizeLegacyScreenCopy(value: unknown): LegacyScreenCopy {
  if (!isObject(value)) return {}

  return {
    title: typeof value.title === 'string' ? value.title : undefined,
    description: typeof value.description === 'string' ? value.description : undefined,
    ctaLabelBefore: typeof value.ctaLabelBefore === 'string' ? value.ctaLabelBefore : undefined,
    ctaLabelAfter: typeof value.ctaLabelAfter === 'string' ? value.ctaLabelAfter : undefined,
  }
}

export function normalizeCampaignJourneyScreenContentConfig(
  value: unknown,
  legacyCopy?: unknown
): CampaignJourneySystemScreenContentConfig {
  const raw = isObject(value) ? value : {}
  const legacy = isObject(legacyCopy) ? legacyCopy : {}
  const legacyRegistration = normalizeLegacyScreenCopy(legacy.registration)
  const legacyDemographics = normalizeLegacyScreenCopy(legacy.demographics)

  return {
    registration: normalizeComposableScreenContent(raw.registration, {
      title: legacyRegistration.title ?? 'Registration',
      body: legacyRegistration.description ?? '',
      ctaLabel: legacyRegistration.ctaLabelBefore ?? legacyRegistration.ctaLabelAfter ?? 'Continue',
      blocks: [],
    }),
    demographics: normalizeComposableScreenContent(raw.demographics, {
      title: legacyDemographics.title ?? 'Demographics',
      body: legacyDemographics.description ?? '',
      ctaLabel: legacyDemographics.ctaLabelBefore ?? legacyDemographics.ctaLabelAfter ?? 'Continue',
      blocks: [],
    }),
    completion: normalizeComposableScreenContent(raw.completion),
  }
}

function getRunnerOverrides(value: unknown) {
  return isObject(value) ? value : {}
}

function getCompletionDefaults(reportAccess: string | undefined) {
  if (reportAccess === 'immediate') {
    return {
      finalisingTitle: 'Generating your results',
      completionTitle: 'Your results are ready',
      completionBody: 'Your responses have been scored and your report is ready to view.',
      completionCtaLabel: 'View report',
    }
  }

  return {
    finalisingTitle: 'Finalising results',
    completionTitle: 'Assessment complete',
    completionBody: 'Thank you for completing this assessment. Your responses have been submitted successfully.',
    completionCtaLabel: 'Continue',
  }
}

function pushPage(
  pages: CampaignJourneyResolvedPage[],
  page: Omit<CampaignJourneyResolvedPage, 'pageOrder'>
) {
  pages.push({
    ...page,
    pageOrder: pages.length,
  })
}

function normalizeFlowSteps(
  flowSteps: unknown[] | null | undefined,
  campaignAssessments: CampaignJourneyFlowAssessment[]
) {
  const normalized = (flowSteps ?? []).map((step) => normalizeCampaignFlowStep(step))
  if (normalized.length > 0) {
    return normalized
  }

  return campaignAssessments
    .filter((step) => step.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((step, index) =>
      normalizeCampaignFlowStep({
        id: step.id,
        campaign_id: '',
        step_type: 'assessment',
        sort_order: index,
        is_active: step.is_active,
        campaign_assessment_id: step.id,
        screen_config: {},
      })
    )
}

function getDefaultPageOrder(input: {
  config: CampaignConfig
  flowSteps: CampaignFlowStep[]
}) {
  const order: string[] = ['intro']
  if (input.config.registration_position === 'before') order.push('registration')
  if (input.config.demographics_enabled && input.config.demographics_position === 'before') order.push('demographics')
  input.flowSteps.forEach((step) => {
    order.push(step.step_type === 'screen' ? `screen-${step.id}` : `assessment-${step.id}`)
  })
  if (input.config.registration_position === 'after') order.push('registration')
  if (input.config.demographics_enabled && input.config.demographics_position === 'after') order.push('demographics')
  order.push('finalising', 'completion')
  return order
}

function normalizePageOrder(input: {
  config: CampaignConfig
  flowSteps: CampaignFlowStep[]
  runnerOverrides: Record<string, unknown>
}) {
  const available = getDefaultPageOrder({ config: input.config, flowSteps: input.flowSteps })
  const rawPageOrder = Array.isArray(input.runnerOverrides.journey_page_order)
    ? input.runnerOverrides.journey_page_order.filter((value): value is string => typeof value === 'string')
    : []

  if (rawPageOrder.length > 0) {
    return [
      ...rawPageOrder.filter((pageId, index, array) => available.includes(pageId) && array.indexOf(pageId) === index),
      ...available.filter((pageId) => !rawPageOrder.includes(pageId)),
    ]
  }

  const legacyOrder = isObject(input.runnerOverrides.journey_system_screen_order)
    ? input.runnerOverrides.journey_system_screen_order
    : {}
  const rawBefore = Array.isArray(legacyOrder.beforeCore)
    ? legacyOrder.beforeCore.filter((value): value is string => typeof value === 'string')
    : []
  const rawAfter = Array.isArray(legacyOrder.afterCore)
    ? legacyOrder.afterCore.filter((value): value is string => typeof value === 'string')
    : []

  if (rawBefore.length > 0 || rawAfter.length > 0) {
    const systemBefore = rawBefore.filter((value) => value === 'intro' || value === 'registration' || value === 'demographics')
    const systemAfter = rawAfter.filter((value) => value === 'registration' || value === 'demographics' || value === 'finalising' || value === 'completion')
    const flowIds = input.flowSteps.map((step) => (step.step_type === 'screen' ? `screen-${step.id}` : `assessment-${step.id}`))
    return [
      ...systemBefore.filter((pageId, index, array) => available.includes(pageId) && array.indexOf(pageId) === index),
      ...flowIds,
      ...systemAfter.filter((pageId, index, array) => available.includes(pageId) && array.indexOf(pageId) === index),
      ...available.filter((pageId) => !systemBefore.some((entry) => entry === pageId) && !systemAfter.some((entry) => entry === pageId) && !flowIds.includes(pageId)),
    ]
  }

  return available
}

function resolvePosition(pageId: string, firstAssessmentIndex: number, lastAssessmentIndex: number, pageIndex: number) {
  if (pageId === 'finalising' || pageId === 'completion') return 'after' as const
  if (firstAssessmentIndex < 0) return pageIndex === 0 ? 'before' as const : 'after' as const
  if (pageIndex < firstAssessmentIndex) return 'before' as const
  if (pageIndex > lastAssessmentIndex) return 'after' as const
  return 'core' as const
}

function createIntroPage(input: {
  runnerConfig: RunnerConfig
  campaignName: string
  organisationName?: string | null
  experienceConfig: AssessmentExperienceConfig
  assessmentDescription?: string | null
}) {
  return {
    id: 'intro',
    type: 'intro',
    title: input.runnerConfig.title || input.campaignName,
    description:
      input.runnerConfig.subtitle
        || input.assessmentDescription
        || (input.organisationName
          ? `Introduce the ${input.organisationName} campaign before the assessment journey begins.`
          : 'Start with a clear introduction before the assessment journey begins.'),
    eyebrow: input.runnerConfig.intro || input.organisationName || 'Campaign',
    ctaLabel: input.runnerConfig.start_cta_label || 'Continue',
    ctaHref: null,
    blocks: [],
    openingBlocks: input.experienceConfig.openingBlocks,
    source: 'experience_config',
    position: 'before',
    movement: 'journey_owned',
    systemKey: 'intro',
  } satisfies Omit<CampaignJourneyResolvedPage, 'pageOrder'>
}

function createComposableSystemPage(input: {
  id: 'registration' | 'demographics' | 'completion'
  type: 'registration' | 'demographics' | 'completion'
  source: 'campaign_config' | 'report_access'
  content: CampaignJourneyComposableScreenContent
  defaultTitle: string
  defaultBody: string
  defaultCtaLabel: string
  defaultCtaHref?: string
}) {
  return {
    id: input.id,
    type: input.type,
    title: input.content.title || input.defaultTitle,
    description: input.content.body || input.defaultBody,
    eyebrow: input.content.eyebrow,
    ctaLabel: input.content.ctaLabel || input.defaultCtaLabel,
    ctaHref: input.content.ctaHref || input.defaultCtaHref || null,
    blocks: input.content.blocks,
    openingBlocks: [],
    source: input.source,
    position: 'after',
    movement: 'journey_owned',
    systemKey: input.id,
    ...(input.content.identityHeading ? { identityHeading: input.content.identityHeading } : {}),
    ...(input.content.identityDescription ? { identityDescription: input.content.identityDescription } : {}),
    ...(input.content.demographicsHeading ? { demographicsHeading: input.content.demographicsHeading } : {}),
    ...(input.content.demographicsDescription ? { demographicsDescription: input.content.demographicsDescription } : {}),
  } satisfies Omit<CampaignJourneyResolvedPage, 'pageOrder'>
}

export function resolveCampaignJourney(input: {
  campaignName: string
  organisationName?: string | null
  campaignConfig: CampaignConfig
  runnerOverrides?: unknown
  assessmentRunnerConfig?: unknown
  assessmentReportConfig?: unknown
  flowSteps?: unknown[] | null
  campaignAssessments?: CampaignJourneyFlowAssessment[] | null
}) {
  const runnerOverrides = getRunnerOverrides(input.runnerOverrides)
  const runnerConfig = normalizeRunnerConfig(input.runnerOverrides ?? input.assessmentRunnerConfig)
  const reportConfig = normalizeReportConfig(input.assessmentReportConfig)
  const experienceConfig = normalizeAssessmentExperienceConfig(runnerOverrides.v2_experience)
  const screenContent = normalizeCampaignJourneyScreenContentConfig(
    runnerOverrides.journey_screen_content,
    runnerOverrides.journey_screen_copy
  )
  const campaignAssessments = (input.campaignAssessments ?? [])
    .filter((step) => step.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
  const flowSteps = normalizeFlowSteps(input.flowSteps, campaignAssessments)
    .filter((step) => step.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
  const effectiveCampaignConfig = applyCampaignRuntimeSafeguards(input.campaignConfig, {
    assessmentCount: flowSteps.filter((step) => step.step_type === 'assessment').length,
  })
  const pageOrder = normalizePageOrder({
    config: effectiveCampaignConfig,
    flowSteps,
    runnerOverrides,
  })

  const primaryAssessment = campaignAssessments[0]?.assessments ?? null
  const completionDefaults = getCompletionDefaults(input.campaignConfig.report_access)

  const availablePageMap = new Map<string, Omit<CampaignJourneyResolvedPage, 'pageOrder'>>()
  availablePageMap.set('intro', createIntroPage({
    runnerConfig,
    campaignName: input.campaignName,
    organisationName: input.organisationName,
    experienceConfig,
    assessmentDescription: primaryAssessment?.description,
  }))

  if (effectiveCampaignConfig.registration_position !== 'none') {
    availablePageMap.set('registration', createComposableSystemPage({
      id: 'registration',
      type: 'registration',
      source: 'campaign_config',
      content: screenContent.registration ?? normalizeComposableScreenContent({}),
      defaultTitle: 'Registration',
      defaultBody: '',
      defaultCtaLabel: 'Continue',
    }))
  }

  if (effectiveCampaignConfig.demographics_enabled) {
    availablePageMap.set('demographics', createComposableSystemPage({
      id: 'demographics',
      type: 'demographics',
      source: 'campaign_config',
      content: screenContent.demographics ?? normalizeComposableScreenContent({}),
      defaultTitle: 'Demographics',
      defaultBody: '',
      defaultCtaLabel: 'Continue',
    }))
  }

  flowSteps.forEach((step, index) => {
    if (step.step_type === 'screen') {
      availablePageMap.set(`screen-${step.id}`, {
        id: `screen-${step.id}`,
        type: 'screen',
        title: step.screen_config.title,
        description: step.screen_config.body_markdown || 'Transition participants between assessment steps.',
        eyebrow: step.screen_config.eyebrow,
        ctaLabel: step.screen_config.cta_label,
        ctaHref: null,
        blocks: step.screen_config.blocks,
        openingBlocks: [],
        source: 'campaign_flow',
        position: 'core',
        movement: 'flow_step',
        systemKey: null,
        flowStep: step,
      })
      return
    }

    const campaignAssessment = campaignAssessments.find(
      (assessment) => assessment.id === step.campaign_assessment_id
    )
    const assessment = campaignAssessment?.assessments ?? null
    availablePageMap.set(`assessment-${step.id}`, {
      id: `assessment-${step.id}`,
      type: 'assessment',
      title: assessment?.externalName || assessment?.name || `Assessment ${index + 1}`,
      description:
        experienceConfig.questionIntroBody
          || assessment?.description
          || 'Deliver the active assessment questions on a dedicated screen.',
      eyebrow: experienceConfig.questionIntroEyebrow,
      ctaLabel: runnerConfig.completion_cta_label || null,
      ctaHref: null,
      blocks: [],
      openingBlocks: [],
      source: 'campaign_flow',
      position: 'core',
      movement: 'flow_step',
      systemKey: null,
      assessment,
      flowStep: step,
    })
  })

  availablePageMap.set('finalising', {
    id: 'finalising',
    type: 'finalising',
    title: experienceConfig.finalisingTitle || completionDefaults.finalisingTitle,
    description: experienceConfig.finalisingBody || 'Show progress while results are prepared.',
    eyebrow: experienceConfig.finalisingKicker,
    ctaLabel: null,
    ctaHref: null,
    blocks: [],
    openingBlocks: [],
    source: 'experience_config',
    position: 'after',
    movement: 'fixed',
    systemKey: 'finalising',
  })

  availablePageMap.set('completion', createComposableSystemPage({
    id: 'completion',
    type: 'completion',
    source: 'report_access',
    content: screenContent.completion ?? normalizeComposableScreenContent({}),
    defaultTitle: runnerConfig.completion_screen_title || completionDefaults.completionTitle,
    defaultBody: runnerConfig.completion_screen_body || completionDefaults.completionBody,
    defaultCtaLabel: runnerConfig.completion_screen_cta_label || completionDefaults.completionCtaLabel,
    defaultCtaHref: runnerConfig.completion_screen_cta_href || '',
  }))

  const assessmentIndices = pageOrder
    .map((pageId, index) => ({ pageId, index }))
    .filter(({ pageId }) => pageId.startsWith('assessment-'))
    .map(({ index }) => index)
  const firstAssessmentIndex = assessmentIndices[0] ?? -1
  const lastAssessmentIndex = assessmentIndices[assessmentIndices.length - 1] ?? -1

  const pages: CampaignJourneyResolvedPage[] = []
  pageOrder.forEach((pageId, index) => {
    const page = availablePageMap.get(pageId)
    if (!page) return

    pushPage(pages, {
      ...page,
      position: resolvePosition(pageId, firstAssessmentIndex, lastAssessmentIndex, index),
    })
  })

  return {
    runnerConfig,
    reportConfig,
    experienceConfig,
    screenContent,
    pageOrder: pages.map((page) => page.id),
    flowSteps,
    pages,
  } satisfies CampaignJourneyResolved
}
