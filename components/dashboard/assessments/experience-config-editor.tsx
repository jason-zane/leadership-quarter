'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  type ReportConfig,
  type RunnerConfig,
  normalizeReportConfig,
  normalizeRunnerConfig,
} from '@/utils/assessments/experience-config'
import { ContextualPreview, type PreviewTabKey } from '@/components/dashboard/config-editor/contextual-preview'
import { ReportCompetencyCopyEditor } from '@/components/dashboard/assessments/report-competency-copy-editor'
import {
  RUNNER_SECTION_ITEMS,
  type RunnerSectionKey,
  RunnerConfigForm,
  sanitizeRunnerConfigDraft,
} from '@/components/dashboard/config-editor/runner-config-form'
import {
  REPORT_SECTION_ITEMS,
  ReportConfigForm,
} from '@/components/dashboard/config-editor/report-config-form'
import { SectionStepper } from '@/components/dashboard/config-editor/section-stepper'
import type { ReportCompetencyDefinition, ReportTraitDefinition } from '@/utils/reports/report-overrides'

type Props = {
  assessmentId: string
  initialRunnerConfig: unknown
  initialReportConfig: unknown
  competencies?: ReportCompetencyDefinition[]
  traits?: ReportTraitDefinition[]
  readiness?: {
    hasCompetencies: boolean
    hasTraits: boolean
    hasDimensionNorms: boolean
    hasTraitNorms: boolean
  }
  mode: 'experience' | 'report'
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function isValidHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) return true
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function validateRunnerConfig(value: RunnerConfig) {
  const errors: Partial<Record<keyof RunnerConfig, string>> = {}
  if (!Number.isFinite(value.estimated_minutes) || value.estimated_minutes < 1 || value.estimated_minutes > 240) {
    errors.estimated_minutes = 'Estimated minutes must be between 1 and 240.'
  }
  if (!isValidHref(value.completion_screen_cta_href)) {
    errors.completion_screen_cta_href = 'Completion CTA link must be a valid URL or relative path.'
  }
  return errors
}

function validateReportConfig(value: ReportConfig) {
  const errors: Partial<Record<keyof ReportConfig, string>> = {}
  if (!isValidHref(value.next_steps_cta_href)) {
    errors.next_steps_cta_href = 'Next steps link must be a valid URL or relative path.'
  }
  return errors
}

function hasErrors(value: Record<string, string | undefined>) {
  return Object.values(value).some(Boolean)
}

function sectionToPreviewTab(section: RunnerSectionKey): PreviewTabKey {
  if (section === 'intro' || section === 'actions') return 'intro'
  if (section === 'completion') return 'completion'
  return 'question'
}

export function AssessmentExperienceConfigEditor({
  assessmentId,
  initialRunnerConfig,
  initialReportConfig,
  competencies = [],
  traits = [],
  readiness,
  mode,
}: Props) {
  const [runnerConfig, setRunnerConfig] = useState<RunnerConfig>(normalizeRunnerConfig(initialRunnerConfig))
  const [reportConfig, setReportConfig] = useState<ReportConfig>(normalizeReportConfig(initialReportConfig))
  const [activeSection, setActiveSection] = useState<string>(
    mode === 'experience' ? RUNNER_SECTION_ITEMS[0].id : REPORT_SECTION_ITEMS[0].id
  )
  const [expandAll, setExpandAll] = useState(false)
  const [previewTab, setPreviewTab] = useState<PreviewTabKey>(
    mode === 'experience' ? 'intro' : 'report'
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const runnerRaw = useMemo(() => asObject(initialRunnerConfig), [initialRunnerConfig])
  const reportRaw = useMemo(() => asObject(initialReportConfig), [initialReportConfig])

  const runnerErrors = validateRunnerConfig(runnerConfig)
  const reportErrors = validateReportConfig(reportConfig)
  const validationFailed = mode === 'experience'
    ? hasErrors(runnerErrors as Record<string, string | undefined>)
    : hasErrors(reportErrors as Record<string, string | undefined>)

  const initialSnapshot = useMemo(() => (
    mode === 'experience'
      ? JSON.stringify(normalizeRunnerConfig(initialRunnerConfig))
      : JSON.stringify(normalizeReportConfig(initialReportConfig))
  ), [initialRunnerConfig, initialReportConfig, mode])
  const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot)

  useEffect(() => {
    setSavedSnapshot(initialSnapshot)
  }, [initialSnapshot])

  const dirty = (
    mode === 'experience'
      ? JSON.stringify(runnerConfig)
      : JSON.stringify(reportConfig)
  ) !== savedSnapshot

  const runnerVisible = mode === 'experience'
    ? (
        expandAll
          ? RUNNER_SECTION_ITEMS.map((section) => section.id)
          : RUNNER_SECTION_ITEMS.filter((section) => section.id === activeSection).map((section) => section.id)
      )
    : []

  const reportVisible = mode === 'report'
    ? (
        expandAll
          ? REPORT_SECTION_ITEMS.map((section) => section.id)
          : REPORT_SECTION_ITEMS.filter((section) => section.id === activeSection).map((section) => section.id)
      )
    : []

  const sectionItems = mode === 'experience' ? RUNNER_SECTION_ITEMS : REPORT_SECTION_ITEMS
  const heading = mode === 'experience' ? 'Assessment experience' : 'Assessment report settings'
  const description = mode === 'experience'
    ? 'Configure the participant-facing journey. Keep the common path simple and use this tab for flow, copy, and completion behavior.'
    : 'Set the shared report presentation defaults here. Individual report variants are managed separately below.'
  const previewTitle = mode === 'experience' ? 'Experience preview' : 'Report preview'
  const saveLabel = mode === 'experience' ? 'Save experience config' : 'Save report config'
  const saveError = mode === 'experience'
    ? 'Failed to save experience configuration.'
    : 'Failed to save report configuration.'
  const previewTabs = mode === 'experience'
    ? (['intro', 'question', 'completion'] as const)
    : (['report'] as const)

  async function save() {
    setError(null)
    setSavedAt(null)

    if (validationFailed) {
      setError('Fix validation issues before saving.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'experience'
            ? { runnerConfig: { ...runnerRaw, ...sanitizeRunnerConfigDraft(runnerConfig) } }
            : { reportConfig: { ...reportRaw, ...reportConfig } }
        ),
      })

      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        setError(body?.error ?? saveError)
        return
      }

      setSavedSnapshot(
        mode === 'experience'
          ? JSON.stringify(runnerConfig)
          : JSON.stringify(reportConfig)
      )
      setSavedAt(new Date().toLocaleTimeString())
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{heading}</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {mode === 'experience' ? (
          <>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">What this tab owns</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Intro, flow, completion, and support copy</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Use next</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Questions if content is still changing, or Campaigns if delivery is next</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Advanced only</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Non-live fields stay marked clearly until runtime supports them</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">What this tab owns</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Shared report template, section visibility, and profile copy</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Manage elsewhere</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Report variants and campaign delivery sit below and in the Campaigns tab</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Best workflow</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Set the shared defaults first, then publish variants that use them</p>
            </div>
          </>
        )}
      </div>

      {mode === 'experience' ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={runnerConfig.data_collection_only}
              onChange={(event) =>
                setRunnerConfig((prev) => ({ ...prev, data_collection_only: event.target.checked }))
              }
              className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
            />
            <div>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Data collection only</span>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Skip the report screen after submission — show the completion/thank-you screen only. Use for surveys where you want raw responses without generating a scored report.
              </p>
            </div>
          </label>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <div className="space-y-4">
          <SectionStepper
            items={sectionItems}
            activeId={activeSection}
            onChange={(section) => {
              setActiveSection(section)
              if (mode === 'experience') {
                setPreviewTab(sectionToPreviewTab(section as RunnerSectionKey))
              }
            }}
            expandAll={expandAll}
            onToggleExpandAll={() => setExpandAll((current) => !current)}
          />

          {mode === 'experience' ? (
            <RunnerConfigForm
              mode="full"
              value={runnerConfig}
              onChange={setRunnerConfig}
              errors={runnerErrors}
              visibleSections={runnerVisible}
            />
          ) : null}

          {mode === 'report' && reportVisible.length > 0 ? (
            <ReportConfigForm value={reportConfig} onChange={setReportConfig} errors={reportErrors} visibleSections={reportVisible} />
          ) : null}

          {mode === 'report' && reportVisible.includes('competencies') ? (
            <>
              {readiness ? (
                <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">STEN readiness</h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      This shows whether the assessment can render competency and trait STEN cards immediately or will need the configured fallback.
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Competencies</p>
                      <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{readiness.hasCompetencies ? 'Configured' : 'Missing'}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Traits</p>
                      <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{readiness.hasTraits ? 'Configured' : 'Missing'}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Competency norms</p>
                      <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{readiness.hasDimensionNorms ? 'Available' : 'Not available'}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Trait norms</p>
                      <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{readiness.hasTraitNorms ? 'Available' : 'Not available'}</p>
                    </div>
                  </div>
                  {reportConfig.report_template === 'sten_profile' ? (
                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Current render path:{' '}
                      {((reportConfig.profile_card_scope === 'dimension' && readiness.hasDimensionNorms)
                        || (reportConfig.profile_card_scope === 'trait' && readiness.hasTraitNorms)
                        || (reportConfig.profile_card_scope === 'both' && readiness.hasDimensionNorms && readiness.hasTraitNorms))
                        ? 'true STEN'
                        : reportConfig.sten_fallback_mode === 'raw'
                          ? 'provisional raw fallback'
                          : 'profile hidden until norms exist'}
                    </p>
                  ) : null}
                </section>
              ) : null}

              <ReportCompetencyCopyEditor
                title="Competency profile copy"
                description="Override the public competency label, description, and low/high behavioural anchors used on the STEN profile cards."
                competencies={competencies}
                value={reportConfig.competency_overrides}
                showAnchors={reportConfig.report_template === 'sten_profile'}
                onChange={(nextOverrides) =>
                  setReportConfig((current) => ({
                    ...current,
                    competency_overrides: nextOverrides,
                  }))
                }
              />

              <ReportCompetencyCopyEditor
                title="Trait profile copy"
                description="Override the public trait label, description, and low/high behavioural anchors used on the STEN profile cards."
                emptyStateCopy="No traits found yet. Add and map traits in the psychometrics area before configuring trait-level profile cards."
                competencies={traits}
                value={reportConfig.trait_overrides}
                showAnchors={reportConfig.report_template === 'sten_profile'}
                onChange={(nextOverrides) =>
                  setReportConfig((current) => ({
                    ...current,
                    trait_overrides: nextOverrides,
                  }))
                }
              />
            </>
          ) : null}
        </div>

        <ContextualPreview
          runnerConfig={runnerConfig}
          reportConfig={reportConfig}
          activeTab={previewTab}
          onTabChange={setPreviewTab}
          title={previewTitle}
          visibleTabs={previewTabs}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {savedAt ? <p className="mt-3 text-xs text-emerald-600">Saved at {savedAt}</p> : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || validationFailed || !dirty}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </section>
  )
}
