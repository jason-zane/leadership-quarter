'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  type ReportConfig,
  type RunnerConfig,
  normalizeReportConfig,
  normalizeRunnerConfig,
} from '@/utils/assessments/experience-config'
import { ContextualPreview, type PreviewTabKey } from '@/components/dashboard/config-editor/contextual-preview'
import {
  RUNNER_SECTION_ITEMS,
  type RunnerSectionKey,
  RunnerConfigForm,
  sanitizeRunnerConfigDraft,
} from '@/components/dashboard/config-editor/runner-config-form'
import {
  REPORT_SECTION_ITEMS,
  type ReportSectionKey,
  ReportConfigForm,
} from '@/components/dashboard/config-editor/report-config-form'
import { SectionStepper } from '@/components/dashboard/config-editor/section-stepper'

type Props = {
  assessmentId: string
  initialRunnerConfig: unknown
  initialReportConfig: unknown
}

type ExperienceSectionKey = RunnerSectionKey | `report-${ReportSectionKey}`

const EXPERIENCE_SECTIONS = [
  ...RUNNER_SECTION_ITEMS,
  ...REPORT_SECTION_ITEMS.map((section) => ({ id: `report-${section.id}` as const, label: `Report: ${section.label}` })),
]

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

function sectionToPreviewTab(section: ExperienceSectionKey): PreviewTabKey {
  if (section === 'intro' || section === 'actions') return 'intro'
  if (section === 'completion') return 'completion'
  if (section.startsWith('report-')) return 'report'
  return 'question'
}

export function AssessmentExperienceConfigEditor({
  assessmentId,
  initialRunnerConfig,
  initialReportConfig,
}: Props) {
  const [runnerConfig, setRunnerConfig] = useState<RunnerConfig>(normalizeRunnerConfig(initialRunnerConfig))
  const [reportConfig, setReportConfig] = useState<ReportConfig>(normalizeReportConfig(initialReportConfig))
  const [activeSection, setActiveSection] = useState<ExperienceSectionKey>('intro')
  const [expandAll, setExpandAll] = useState(false)
  const [previewTab, setPreviewTab] = useState<PreviewTabKey>('intro')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const runnerRaw = useMemo(() => asObject(initialRunnerConfig), [initialRunnerConfig])
  const reportRaw = useMemo(() => asObject(initialReportConfig), [initialReportConfig])

  const runnerErrors = validateRunnerConfig(runnerConfig)
  const reportErrors = validateReportConfig(reportConfig)
  const validationFailed = hasErrors(runnerErrors as Record<string, string | undefined>) || hasErrors(reportErrors as Record<string, string | undefined>)

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        runner: normalizeRunnerConfig(initialRunnerConfig),
        report: normalizeReportConfig(initialReportConfig),
      }),
    [initialRunnerConfig, initialReportConfig]
  )
  const [savedSnapshot, setSavedSnapshot] = useState(initialSnapshot)

  useEffect(() => {
    setSavedSnapshot(initialSnapshot)
  }, [initialSnapshot])

  const dirty = JSON.stringify({ runner: runnerConfig, report: reportConfig }) !== savedSnapshot

  const runnerVisible = expandAll
    ? RUNNER_SECTION_ITEMS.map((section) => section.id)
    : RUNNER_SECTION_ITEMS.filter((section) => section.id === activeSection).map((section) => section.id)

  const activeReportSection = activeSection.startsWith('report-')
    ? (activeSection.replace('report-', '') as ReportSectionKey)
    : null

  const reportVisible = expandAll
    ? REPORT_SECTION_ITEMS.map((section) => section.id)
    : activeReportSection
      ? [activeReportSection]
      : []

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
        body: JSON.stringify({
          runnerConfig: { ...runnerRaw, ...sanitizeRunnerConfigDraft(runnerConfig) },
          reportConfig: { ...reportRaw, ...reportConfig },
        }),
      })

      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        setError(body?.error ?? 'Failed to save experience configuration.')
        return
      }

      setSavedSnapshot(JSON.stringify({ runner: runnerConfig, report: reportConfig }))
      setSavedAt(new Date().toLocaleTimeString())
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Assessment experience</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Configure intro, assessment flow, completion, and report content without editing JSON.
      </p>

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

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <div className="space-y-4">
          <SectionStepper
            items={EXPERIENCE_SECTIONS}
            activeId={activeSection}
            onChange={(section) => {
              const nextSection = section as ExperienceSectionKey
              setActiveSection(nextSection)
              setPreviewTab(sectionToPreviewTab(nextSection))
            }}
            expandAll={expandAll}
            onToggleExpandAll={() => setExpandAll((current) => !current)}
          />

          <RunnerConfigForm mode="full" value={runnerConfig} onChange={setRunnerConfig} errors={runnerErrors} visibleSections={runnerVisible} />

          {reportVisible.length > 0 ? (
            <ReportConfigForm value={reportConfig} onChange={setReportConfig} errors={reportErrors} visibleSections={reportVisible} />
          ) : null}
        </div>

        <ContextualPreview
          runnerConfig={runnerConfig}
          reportConfig={reportConfig}
          activeTab={previewTab}
          onTabChange={setPreviewTab}
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
          {saving ? 'Saving...' : 'Save experience config'}
        </button>
      </div>
    </section>
  )
}
