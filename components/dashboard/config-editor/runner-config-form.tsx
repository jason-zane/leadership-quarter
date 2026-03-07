import type { ChangeEvent, ReactNode } from 'react'
import type { ProgressStyle, QuestionPresentation, RunnerConfig, ThemeVariant } from '@/utils/assessments/experience-config'
import { ConfigSection } from '@/components/dashboard/config-editor/config-section'
import { FieldHint } from '@/components/dashboard/config-editor/field-hint'

const runnerFieldOrder = [
  'intro',
  'title',
  'subtitle',
  'estimated_minutes',
  'start_cta_label',
  'completion_cta_label',
  'progress_style',
  'question_presentation',
  'show_dimension_badges',
  'confirmation_copy',
  'completion_screen_title',
  'completion_screen_body',
  'completion_screen_cta_label',
  'completion_screen_cta_href',
  'support_contact_email',
  'theme_variant',
] as const

export type RunnerFieldKey = (typeof runnerFieldOrder)[number]
export const RUNNER_FIELD_KEYS = new Set<string>(runnerFieldOrder)

export type RunnerOverrideConfig = Partial<RunnerConfig>

export const RUNNER_SECTION_ITEMS = [
  { id: 'intro', label: 'Intro' },
  { id: 'actions', label: 'Actions' },
  { id: 'flow', label: 'Flow' },
  { id: 'support', label: 'Support' },
  { id: 'theme', label: 'Theme' },
  { id: 'completion', label: 'Completion' },
] as const

export type RunnerSectionKey = (typeof RUNNER_SECTION_ITEMS)[number]['id']

const NON_LIVE_FIELDS = new Set<RunnerFieldKey>([
  'progress_style',
  'question_presentation',
  'show_dimension_badges',
  'theme_variant',
])

type FullProps = {
  mode: 'full'
  value: RunnerConfig
  onChange: (value: RunnerConfig) => void
  errors?: Partial<Record<RunnerFieldKey, string>>
  visibleSections?: RunnerSectionKey[]
}

type OverrideProps = {
  mode: 'override'
  value: RunnerOverrideConfig
  onChange: (value: RunnerOverrideConfig) => void
  defaults: RunnerConfig
  errors?: Partial<Record<RunnerFieldKey, string>>
  visibleSections?: RunnerSectionKey[]
}

type Props = FullProps | OverrideProps

function FieldWrapper({
  label,
  where,
  helper,
  error,
  reset,
  readOnly,
  children,
}: {
  label: string
  where: string
  helper?: string
  error?: string
  reset?: () => void
  readOnly?: boolean
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
          {readOnly ? (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
              Not live yet
            </span>
          ) : null}
        </div>
        {reset && !readOnly ? (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Reset
          </button>
        ) : null}
      </div>
      {children}
      <FieldHint where={where} helper={helper} />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  )
}

function inputClass(hasError?: boolean) {
  return `w-full rounded-md border px-3 py-2 text-sm dark:bg-zinc-950 ${
    hasError ? 'border-red-400 dark:border-red-700' : 'border-zinc-300 dark:border-zinc-700'
  }`
}

function setFull<K extends keyof RunnerConfig>(
  value: RunnerConfig,
  onChange: (next: RunnerConfig) => void,
  key: K,
  nextValue: RunnerConfig[K]
) {
  onChange({ ...value, [key]: nextValue })
}

function setOverride<K extends keyof RunnerConfig>(
  value: RunnerOverrideConfig,
  onChange: (next: RunnerOverrideConfig) => void,
  key: K,
  nextValue: RunnerConfig[K] | undefined
) {
  const next = { ...value }
  if (typeof nextValue === 'undefined') {
    delete next[key]
  } else {
    next[key] = nextValue
  }
  onChange(next)
}

function parseMinutes(input: string): number | undefined {
  if (!input.trim()) return undefined
  const numeric = Number.parseInt(input, 10)
  if (!Number.isFinite(numeric)) return undefined
  return numeric
}

export function RunnerConfigForm(props: Props) {
  const errors = props.errors ?? {}
  const full = props.mode === 'full'
  const visibleSections = new Set<RunnerSectionKey>(props.visibleSections ?? RUNNER_SECTION_ITEMS.map((section) => section.id))

  const stringValue = (key: keyof RunnerConfig): string => {
    if (full) return props.value[key] as string
    const override = props.value[key]
    return typeof override === 'string' ? override : ''
  }

  const numberValue = (key: keyof RunnerConfig): string => {
    if (full) return String(props.value[key] as number)
    const override = props.value[key]
    return typeof override === 'number' ? String(override) : ''
  }

  const booleanValue = (key: keyof RunnerConfig): string => {
    if (full) return String(props.value[key] as boolean)
    const override = props.value[key]
    if (typeof override === 'boolean') return String(override)
    return 'inherit'
  }

  const handleString =
    (key: keyof RunnerConfig) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = event.target.value
      if (full) {
        setFull(props.value, props.onChange, key, value as RunnerConfig[typeof key])
        return
      }
      if (!value || value === 'inherit') {
        setOverride(props.value, props.onChange, key, undefined)
        return
      }
      setOverride(props.value, props.onChange, key, value as RunnerConfig[typeof key])
    }

  const handleNumber = (key: keyof RunnerConfig) => (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = parseMinutes(event.target.value)
    if (full) {
      setFull(props.value, props.onChange, key, (parsed ?? 1) as RunnerConfig[typeof key])
      return
    }
    setOverride(props.value, props.onChange, key, parsed as RunnerConfig[typeof key] | undefined)
  }

  const handleBool = (key: keyof RunnerConfig) => (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value
    if (full) {
      setFull(props.value, props.onChange, key, (selected === 'true') as RunnerConfig[typeof key])
      return
    }
    if (selected === 'inherit') {
      setOverride(props.value, props.onChange, key, undefined)
      return
    }
    setOverride(props.value, props.onChange, key, (selected === 'true') as RunnerConfig[typeof key])
  }

  const resetField = (key: keyof RunnerConfig) => {
    if (full) return undefined
    return () => setOverride(props.value, props.onChange, key, undefined)
  }

  const inheritedText = (key: keyof RunnerConfig) => {
    if (full) return undefined
    const defaults = props.defaults[key]
    if (typeof defaults === 'string') return `Inherits: ${defaults}`
    if (typeof defaults === 'number') return `Inherits: ${defaults}`
    if (typeof defaults === 'boolean') return `Inherits: ${defaults ? 'Enabled' : 'Disabled'}`
    return undefined
  }

  const helperText = (key: RunnerFieldKey) => {
    const inherited = inheritedText(key)
    if (!NON_LIVE_FIELDS.has(key)) return inherited
    if (!inherited) return 'Saved in config, but current assessment runtime does not apply this yet.'
    return `${inherited}. Saved in config, but current assessment runtime does not apply this yet.`
  }

  const selectableValue = (key: keyof RunnerConfig): string => {
    if (full) return stringValue(key)
    return stringValue(key) || 'inherit'
  }

  return (
    <div className="space-y-4">
      {visibleSections.has('intro') ? (
        <ConfigSection title="Intro screen" description="Set the first content users see before starting the assessment.">
          <FieldWrapper label="Intro line" where="Small line above assessment title." helper={helperText('intro')} error={errors.intro} reset={resetField('intro')}>
            <input value={stringValue('intro')} onChange={handleString('intro')} className={inputClass(Boolean(errors.intro))} placeholder={full ? undefined : String(props.defaults.intro)} />
          </FieldWrapper>
          <FieldWrapper label="Title" where="Main heading on the assessment intro." helper={helperText('title')} error={errors.title} reset={resetField('title')}>
            <input value={stringValue('title')} onChange={handleString('title')} className={inputClass(Boolean(errors.title))} placeholder={full ? undefined : String(props.defaults.title)} />
          </FieldWrapper>
          <FieldWrapper label="Subtitle" where="Support copy below the title." helper={helperText('subtitle')} error={errors.subtitle} reset={resetField('subtitle')}>
            <textarea value={stringValue('subtitle')} onChange={handleString('subtitle')} rows={2} className={inputClass(Boolean(errors.subtitle))} placeholder={full ? undefined : String(props.defaults.subtitle)} />
          </FieldWrapper>
          <FieldWrapper label="Estimated minutes" where="Displayed near the start button." helper={helperText('estimated_minutes')} error={errors.estimated_minutes} reset={resetField('estimated_minutes')}>
            <input type="number" min={1} max={240} value={numberValue('estimated_minutes')} onChange={handleNumber('estimated_minutes')} className={inputClass(Boolean(errors.estimated_minutes))} placeholder={full ? undefined : String(props.defaults.estimated_minutes)} />
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visibleSections.has('actions') ? (
        <ConfigSection title="Primary actions" description="Button labels used through the assessment flow.">
          <FieldWrapper label="Start button label" where="Primary button on intro screen." helper={helperText('start_cta_label')} error={errors.start_cta_label} reset={resetField('start_cta_label')}>
            <input value={stringValue('start_cta_label')} onChange={handleString('start_cta_label')} className={inputClass(Boolean(errors.start_cta_label))} placeholder={full ? undefined : String(props.defaults.start_cta_label)} />
          </FieldWrapper>
          <FieldWrapper label="Submit button label" where="Final button before completion." helper={helperText('completion_cta_label')} error={errors.completion_cta_label} reset={resetField('completion_cta_label')}>
            <input value={stringValue('completion_cta_label')} onChange={handleString('completion_cta_label')} className={inputClass(Boolean(errors.completion_cta_label))} placeholder={full ? undefined : String(props.defaults.completion_cta_label)} />
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visibleSections.has('flow') ? (
        <ConfigSection title="Assessment flow display" description="How question flow is presented while answering.">
          <FieldWrapper label="Progress style" where="Top progress treatment during answering." helper={helperText('progress_style')} error={errors.progress_style} reset={resetField('progress_style')} readOnly>
            <select disabled value={selectableValue('progress_style')} onChange={handleString('progress_style')} className={inputClass(Boolean(errors.progress_style)) + ' opacity-70'}>
              {full ? null : <option value="inherit">Inherit</option>}
              <option value="bar">Bar</option>
              <option value="steps">Steps</option>
              <option value="percent">Percent</option>
            </select>
          </FieldWrapper>
          <FieldWrapper label="Question presentation" where="Whether questions appear one-by-one or paged." helper={helperText('question_presentation')} error={errors.question_presentation} reset={resetField('question_presentation')} readOnly>
            <select disabled value={selectableValue('question_presentation')} onChange={handleString('question_presentation')} className={inputClass(Boolean(errors.question_presentation)) + ' opacity-70'}>
              {full ? null : <option value="inherit">Inherit</option>}
              <option value="single">Single</option>
              <option value="paged">Paged</option>
            </select>
          </FieldWrapper>
          <FieldWrapper label="Show dimension badges" where="Shows dimension tag on question card." helper={helperText('show_dimension_badges')} error={errors.show_dimension_badges} reset={resetField('show_dimension_badges')} readOnly>
            <select disabled value={booleanValue('show_dimension_badges')} onChange={handleBool('show_dimension_badges')} className={inputClass(Boolean(errors.show_dimension_badges)) + ' opacity-70'}>
              {full ? null : <option value="inherit">Inherit</option>}
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visibleSections.has('support') ? (
        <ConfigSection title="Confirmation and support" description="Copy shown after submit and support contact details.">
          <FieldWrapper label="Confirmation message" where="Shown after the final answer is submitted." helper={helperText('confirmation_copy')} error={errors.confirmation_copy} reset={resetField('confirmation_copy')}>
            <textarea value={stringValue('confirmation_copy')} onChange={handleString('confirmation_copy')} rows={2} className={inputClass(Boolean(errors.confirmation_copy))} placeholder={full ? undefined : String(props.defaults.confirmation_copy)} />
          </FieldWrapper>
          <FieldWrapper label="Support contact email" where="Support prompt on assessment pages." helper={helperText('support_contact_email')} error={errors.support_contact_email} reset={resetField('support_contact_email')}>
            <input value={stringValue('support_contact_email')} onChange={handleString('support_contact_email')} className={inputClass(Boolean(errors.support_contact_email))} placeholder={full ? undefined : String(props.defaults.support_contact_email)} />
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visibleSections.has('theme') ? (
        <ConfigSection title="Theme" description="Visual style variant for the assessment runner.">
          <FieldWrapper label="Theme variant" where="Applied to assessment pages." helper={helperText('theme_variant')} error={errors.theme_variant} reset={resetField('theme_variant')} readOnly>
            <select disabled value={selectableValue('theme_variant')} onChange={handleString('theme_variant')} className={inputClass(Boolean(errors.theme_variant)) + ' opacity-70'}>
              {full ? null : <option value="inherit">Inherit</option>}
              <option value="default">Default</option>
              <option value="minimal">Minimal</option>
              <option value="executive">Executive</option>
            </select>
          </FieldWrapper>
        </ConfigSection>
      ) : null}

      {visibleSections.has('completion') ? (
        <ConfigSection title="Completion screen" description="Content shown once users complete all questions.">
          <FieldWrapper label="Completion title" where="Completion panel heading." helper={helperText('completion_screen_title')} error={errors.completion_screen_title} reset={resetField('completion_screen_title')}>
            <input value={stringValue('completion_screen_title')} onChange={handleString('completion_screen_title')} className={inputClass(Boolean(errors.completion_screen_title))} placeholder={full ? undefined : String(props.defaults.completion_screen_title)} />
          </FieldWrapper>
          <FieldWrapper label="Completion body" where="Completion panel supporting copy." helper={helperText('completion_screen_body')} error={errors.completion_screen_body} reset={resetField('completion_screen_body')}>
            <textarea value={stringValue('completion_screen_body')} onChange={handleString('completion_screen_body')} rows={2} className={inputClass(Boolean(errors.completion_screen_body))} placeholder={full ? undefined : String(props.defaults.completion_screen_body)} />
          </FieldWrapper>
          <FieldWrapper label="Completion CTA label" where="Primary button on completion screen." helper={helperText('completion_screen_cta_label')} error={errors.completion_screen_cta_label} reset={resetField('completion_screen_cta_label')}>
            <input value={stringValue('completion_screen_cta_label')} onChange={handleString('completion_screen_cta_label')} className={inputClass(Boolean(errors.completion_screen_cta_label))} placeholder={full ? undefined : String(props.defaults.completion_screen_cta_label)} />
          </FieldWrapper>
          <FieldWrapper label="Completion CTA link" where="Navigation target from completion button." helper={helperText('completion_screen_cta_href')} error={errors.completion_screen_cta_href} reset={resetField('completion_screen_cta_href')}>
            <input value={stringValue('completion_screen_cta_href')} onChange={handleString('completion_screen_cta_href')} className={inputClass(Boolean(errors.completion_screen_cta_href))} placeholder={full ? undefined : String(props.defaults.completion_screen_cta_href)} />
          </FieldWrapper>
        </ConfigSection>
      ) : null}
    </div>
  )
}

export function sanitizeRunnerConfigDraft(value: RunnerConfig): RunnerConfig {
  return {
    ...value,
    estimated_minutes: Math.min(240, Math.max(1, Math.round(value.estimated_minutes || 1))),
    progress_style: (['bar', 'steps', 'percent'] as ProgressStyle[]).includes(value.progress_style)
      ? value.progress_style
      : 'bar',
    question_presentation: (['single', 'paged'] as QuestionPresentation[]).includes(value.question_presentation)
      ? value.question_presentation
      : 'single',
    theme_variant: (['default', 'minimal', 'executive'] as ThemeVariant[]).includes(value.theme_variant)
      ? value.theme_variant
      : 'minimal',
  }
}

export function compactRunnerOverrides(value: RunnerOverrideConfig): RunnerOverrideConfig {
  return Object.fromEntries(Object.entries(value).filter((entry) => typeof entry[1] !== 'undefined')) as RunnerOverrideConfig
}
