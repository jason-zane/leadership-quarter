export type ProgressStyle = 'bar' | 'steps' | 'percent'
export type QuestionPresentation = 'single' | 'paged'
export type ThemeVariant = 'default' | 'minimal' | 'executive'

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
}

export type ReportConfig = {
  title: string
  subtitle: string
  show_overall_classification: boolean
  show_dimension_scores: boolean
  show_recommendations: boolean
  next_steps_cta_label: string
  next_steps_cta_href: string
  pdf_enabled: boolean
}

export const DEFAULT_RUNNER_CONFIG: RunnerConfig = {
  intro: 'A focused assessment experience.',
  title: 'Assessment',
  subtitle: 'Answer each question based on your current experience.',
  estimated_minutes: 5,
  start_cta_label: 'Begin assessment',
  completion_cta_label: 'Submit assessment',
  progress_style: 'bar',
  question_presentation: 'single',
  show_dimension_badges: true,
  confirmation_copy: 'Thanks. Your responses have been recorded.',
  completion_screen_title: 'Assessment complete',
  completion_screen_body: 'Thank you. Your responses have been submitted successfully.',
  completion_screen_cta_label: 'Back to AI Readiness',
  completion_screen_cta_href: '/framework/lq-ai-readiness',
  support_contact_email: '',
  theme_variant: 'minimal',
}

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  title: 'Assessment report',
  subtitle: 'Your current profile and recommended next steps.',
  show_overall_classification: true,
  show_dimension_scores: true,
  show_recommendations: true,
  next_steps_cta_label: 'Back to assessments',
  next_steps_cta_href: '/assess',
  pdf_enabled: false,
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
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
    next_steps_cta_label:
      typeof value.next_steps_cta_label === 'string'
        ? value.next_steps_cta_label
        : DEFAULT_REPORT_CONFIG.next_steps_cta_label,
    next_steps_cta_href:
      typeof value.next_steps_cta_href === 'string'
        ? value.next_steps_cta_href
        : DEFAULT_REPORT_CONFIG.next_steps_cta_href,
    pdf_enabled: typeof value.pdf_enabled === 'boolean' ? value.pdf_enabled : DEFAULT_REPORT_CONFIG.pdf_enabled,
  }
}

export function mergeRunnerConfig(base: unknown, overrides: unknown): RunnerConfig {
  const normalizedBase = normalizeRunnerConfig(base)
  if (!isObject(overrides)) return normalizedBase
  return normalizeRunnerConfig({ ...normalizedBase, ...overrides })
}
