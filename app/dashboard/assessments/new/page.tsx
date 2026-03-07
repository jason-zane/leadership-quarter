'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  DEFAULT_REPORT_CONFIG,
  DEFAULT_RUNNER_CONFIG,
  type ReportConfig,
  type RunnerConfig,
} from '@/utils/assessments/experience-config'
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
import { ContextualPreview, type PreviewTabKey } from '@/components/dashboard/config-editor/contextual-preview'
import { SectionStepper } from '@/components/dashboard/config-editor/section-stepper'

type ExperienceSectionKey = RunnerSectionKey | `report-${ReportSectionKey}`

const EXPERIENCE_SECTIONS = [
  ...RUNNER_SECTION_ITEMS,
  ...REPORT_SECTION_ITEMS.map((section) => ({ id: `report-${section.id}` as const, label: `Report: ${section.label}` })),
]

function sectionToPreviewTab(section: ExperienceSectionKey): PreviewTabKey {
  if (section === 'intro' || section === 'actions') return 'intro'
  if (section === 'completion') return 'completion'
  if (section.startsWith('report-')) return 'report'
  return 'question'
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

export default function NewAssessmentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [activeSection, setActiveSection] = useState<ExperienceSectionKey>('intro')
  const [expandAll, setExpandAll] = useState(false)
  const [previewTab, setPreviewTab] = useState<PreviewTabKey>('intro')
  const [runnerConfig, setRunnerConfig] = useState<RunnerConfig>(DEFAULT_RUNNER_CONFIG)
  const [reportConfig, setReportConfig] = useState<ReportConfig>(DEFAULT_REPORT_CONFIG)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runnerErrors = useMemo(() => validateRunnerConfig(runnerConfig), [runnerConfig])
  const reportErrors = useMemo(() => validateReportConfig(reportConfig), [reportConfig])
  const validationFailed = hasErrors(runnerErrors as Record<string, string | undefined>) || hasErrors(reportErrors as Record<string, string | undefined>)

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (validationFailed) {
      setError('Fix validation issues before creating the assessment.')
      return
    }

    setIsSaving(true)

    const response = await fetch('/api/admin/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        key,
        isPublic,
        runnerConfig: sanitizeRunnerConfigDraft(runnerConfig),
        reportConfig,
      }),
    })

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean
      assessment?: { id: string }
      survey?: { id: string }
    } | null
    const createdAssessment = body?.assessment ?? body?.survey

    if (!response.ok || !body?.ok || !createdAssessment?.id) {
      setError('Could not create assessment.')
      setIsSaving(false)
      return
    }

    router.push(`/dashboard/assessments/${createdAssessment.id}`)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Create assessment</h1>
      <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Key</span>
            <input value={key} onChange={(e) => setKey(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public assessment
        </label>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
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
            title="Assessment preview"
            activeTab={previewTab}
            onTabChange={setPreviewTab}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button disabled={isSaving || validationFailed} className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
          {isSaving ? 'Saving...' : 'Create assessment'}
        </button>
      </form>
    </div>
  )
}
