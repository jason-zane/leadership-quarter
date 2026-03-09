export type ProgressStyle = 'bar' | 'steps' | 'percent'
export type QuestionPresentation = 'single' | 'paged'
export type ThemeVariant = 'default' | 'minimal' | 'executive'

export type CampaignExperienceContext = {
  campaignName: string
  organisationName?: string | null
  assessmentName?: string | null
}

export type ReportCompetencyOverride = {
  label?: string
  description?: string
}

export type ReportCompetencyOverrides = Record<string, ReportCompetencyOverride>

export type RunnerConfig = {
  intro: string
  title: string
  subtitle: string
  estimated_minutes: number
  start_cta_label: string
  completion_cta_label: string
  progress_style: ProgressStyle
  question_presentation: QuestionPresentation
  show_dimension_badges: boolean
  confirmation_copy: string
  completion_screen_title: string
  completion_screen_body: string
  completion_screen_cta_label: string
  completion_screen_cta_href: string
  support_contact_email: string
  theme_variant: ThemeVariant
  data_collection_only: boolean
}

export type ReportConfig = {
  title: string
  subtitle: string
  show_overall_classification: boolean
  show_dimension_scores: boolean
  show_recommendations: boolean
  show_trait_scores: boolean
  show_interpretation_text: boolean
  next_steps_cta_label: string
  next_steps_cta_href: string
  pdf_enabled: boolean
  scoring_display_mode: 'percentile' | 'raw'
  competency_overrides: ReportCompetencyOverrides
}

export const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  intro: 'A guided assessment experience',
  title: 'Assessment',
  subtitle: 'Answer each question based on your current experience so we can reflect your current profile clearly.',
  estimated_minutes: 8,
  start_cta_label: 'Start assessment',
  completion_cta_label: 'Submit responses',
  progress_style: 'bar',
  question_presentation: 'single',
  show_dimension_badges: true,
  confirmation_copy: 'Thanks. Your responses have been recorded.',
  completion_screen_title: 'Assessment complete',
  completion_screen_body: 'Thank you. Your responses have been submitted successfully.',
  completion_screen_cta_label: 'Return to Leadership Quarter',
  completion_screen_cta_href: '/assess',
  support_contact_email: '',
  theme_variant: 'minimal',
  data_collection_only: false,
}

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  title: 'Assessment report',
  subtitle: 'Your current profile and recommended next steps.',
  show_overall_classification: true,
  show_dimension_scores: true,
  show_recommendations: true,
  show_trait_scores: true,
  show_interpretation_text: true,
  next_steps_cta_label: 'Back to assessments',
  next_steps_cta_href: '/assess',
  pdf_enabled: true,
  scoring_display_mode: 'percentile',
  competency_overrides: {},
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeReportCompetencyOverrides(value: unknown): ReportCompetencyOverrides {
  if (!isObject(value)) {
    return {}
  }

  const normalized: ReportCompetencyOverrides = {}

  for (const [key, override] of Object.entries(value)) {
    if (!key.trim() || !isObject(override)) {
      continue
    }

    const trimmedLabel = typeof override.label === 'string' ? override.label.trim() : ''
    const trimmedDescription = typeof override.description === 'string' ? override.description.trim() : ''
    const nextOverride: ReportCompetencyOverride = {
      ...(trimmedLabel ? { label: trimmedLabel } : {}),
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    }

    if (Object.keys(nextOverride).length > 0) {
      normalized[key] = nextOverride
    }
  }

  return normalized
}

export function normalizeRunnerConfig(value: unknown): RunnerConfig {
  if (!isObject(value)) return DEFAULT_RUNNER_CONFIG

  return {
    intro: typeof value.intro === 'string' ? value.intro : DEFAULT_RUNNER_CONFIG.intro,
    title: typeof value.title === 'string' ? value.title : DEFAULT_RUNNER_CONFIG.title,
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : DEFAULT_RUNNER_CONFIG.subtitle,
    estimated_minutes:
      typeof value.estimated_minutes === 'number' && Number.isFinite(value.estimated_minutes)
        ? Math.max(1, Math.round(value.estimated_minutes))
        : DEFAULT_RUNNER_CONFIG.estimated_minutes,
    start_cta_label:
      typeof value.start_cta_label === 'string'
        ? value.start_cta_label
        : DEFAULT_RUNNER_CONFIG.start_cta_label,
    completion_cta_label:
      typeof value.completion_cta_label === 'string'
        ? value.completion_cta_label
        : DEFAULT_RUNNER_CONFIG.completion_cta_label,
    progress_style:
      value.progress_style === 'bar' || value.progress_style === 'steps' || value.progress_style === 'percent'
        ? value.progress_style
        : DEFAULT_RUNNER_CONFIG.progress_style,
    question_presentation:
      value.question_presentation === 'single' || value.question_presentation === 'paged'
        ? value.question_presentation
        : DEFAULT_RUNNER_CONFIG.question_presentation,
    show_dimension_badges:
      typeof value.show_dimension_badges === 'boolean'
        ? value.show_dimension_badges
        : DEFAULT_RUNNER_CONFIG.show_dimension_badges,
    confirmation_copy:
      typeof value.confirmation_copy === 'string'
        ? value.confirmation_copy
        : DEFAULT_RUNNER_CONFIG.confirmation_copy,
    completion_screen_title:
      typeof value.completion_screen_title === 'string'
        ? value.completion_screen_title
        : DEFAULT_RUNNER_CONFIG.completion_screen_title,
    completion_screen_body:
      typeof value.completion_screen_body === 'string'
        ? value.completion_screen_body
        : DEFAULT_RUNNER_CONFIG.completion_screen_body,
    completion_screen_cta_label:
      typeof value.completion_screen_cta_label === 'string'
        ? value.completion_screen_cta_label
        : DEFAULT_RUNNER_CONFIG.completion_screen_cta_label,
    completion_screen_cta_href:
      typeof value.completion_screen_cta_href === 'string'
        ? value.completion_screen_cta_href
        : DEFAULT_RUNNER_CONFIG.completion_screen_cta_href,
    support_contact_email:
      typeof value.support_contact_email === 'string'
        ? value.support_contact_email
        : DEFAULT_RUNNER_CONFIG.support_contact_email,
    theme_variant:
      value.theme_variant === 'default' || value.theme_variant === 'minimal' || value.theme_variant === 'executive'
        ? value.theme_variant
        : DEFAULT_RUNNER_CONFIG.theme_variant,
    data_collection_only:
      typeof value.data_collection_only === 'boolean'
        ? value.data_collection_only
        : DEFAULT_RUNNER_CONFIG.data_collection_only,
  }
}

export function normalizeReportConfig(value: unknown): ReportConfig {
  if (!isObject(value)) return DEFAULT_REPORT_CONFIG

  return {
    title: typeof value.title === 'string' ? value.title : DEFAULT_REPORT_CONFIG.title,
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : DEFAULT_REPORT_CONFIG.subtitle,
    show_overall_classification:
      typeof value.show_overall_classification === 'boolean'
        ? value.show_overall_classification
        : DEFAULT_REPORT_CONFIG.show_overall_classification,
    show_dimension_scores:
      typeof value.show_dimension_scores === 'boolean'
        ? value.show_dimension_scores
        : DEFAULT_REPORT_CONFIG.show_dimension_scores,
    show_recommendations:
      typeof value.show_recommendations === 'boolean'
        ? value.show_recommendations
        : DEFAULT_REPORT_CONFIG.show_recommendations,
    show_trait_scores:
      typeof value.show_trait_scores === 'boolean'
        ? value.show_trait_scores
        : DEFAULT_REPORT_CONFIG.show_trait_scores,
    show_interpretation_text:
      typeof value.show_interpretation_text === 'boolean'
        ? value.show_interpretation_text
        : DEFAULT_REPORT_CONFIG.show_interpretation_text,
    next_steps_cta_label:
      typeof value.next_steps_cta_label === 'string'
        ? value.next_steps_cta_label
        : DEFAULT_REPORT_CONFIG.next_steps_cta_label,
    next_steps_cta_href:
      typeof value.next_steps_cta_href === 'string'
        ? value.next_steps_cta_href
        : DEFAULT_REPORT_CONFIG.next_steps_cta_href,
    pdf_enabled: typeof value.pdf_enabled === 'boolean' ? value.pdf_enabled : DEFAULT_REPORT_CONFIG.pdf_enabled,
    scoring_display_mode: value.scoring_display_mode === 'raw' ? 'raw' : 'percentile',
    competency_overrides: normalizeReportCompetencyOverrides(value.competency_overrides),
  }
}

export function mergeRunnerConfig(base: unknown, overrides: unknown): RunnerConfig {
  const normalizedBase = normalizeRunnerConfig(base)
  if (!isObject(overrides)) return normalizedBase
  return normalizeRunnerConfig({ ...normalizedBase, ...overrides })
}

function tidyName(value: string | null | undefined) {
  return String(value ?? '').trim()
}

export function getCampaignDefaultRunnerConfig(context: CampaignExperienceContext): RunnerConfig {
  const campaignName = tidyName(context.campaignName) || 'Assessment'
  const organisationName = tidyName(context.organisationName)
  const assessmentName = tidyName(context.assessmentName)
  const title = campaignName
  const intro = organisationName
    ? `${organisationName} assessment`
    : assessmentName
      ? `${assessmentName} campaign`
      : 'Campaign assessment'
  const subtitle = assessmentName
    ? `You are about to begin the ${assessmentName}. Take a few minutes to respond honestly so the results are useful and practical.`
    : 'Take a few minutes to respond honestly so the results are useful, practical, and easy to act on.'

  return normalizeRunnerConfig({
    ...DEFAULT_RUNNER_CONFIG,
    intro,
    title,
    subtitle,
  })
}

export function resolveCampaignRunnerConfig(
  base: unknown,
  overrides: unknown,
  context: CampaignExperienceContext
): RunnerConfig {
  const normalizedBase = normalizeRunnerConfig(base)
  const campaignDefaults = getCampaignDefaultRunnerConfig(context)

  return normalizeRunnerConfig({
    ...normalizedBase,
    intro: campaignDefaults.intro,
    title: campaignDefaults.title,
    subtitle: campaignDefaults.subtitle,
    ...((isObject(overrides) ? overrides : {}) as Record<string, unknown>),
  })
}
