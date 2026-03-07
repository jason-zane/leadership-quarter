'use client'

import { useMemo, useState } from 'react'
import {
  type ReportConfig,
  type RunnerConfig,
  normalizeReportConfig,
  normalizeRunnerConfig,
} from '@/utils/assessments/experience-config'

const tabs = [
  { key: 'intro', label: 'Intro' },
  { key: 'question', label: 'Question' },
  { key: 'completion', label: 'Completion' },
  { key: 'report', label: 'Report' },
] as const

export type PreviewTabKey = (typeof tabs)[number]['key']

type Props = {
  runnerConfig: unknown
  reportConfig: unknown
  title?: string
  activeTab?: PreviewTabKey
  onTabChange?: (tab: PreviewTabKey) => void
}

function Chip({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  )
}

function ButtonShell({ label }: { label: string }) {
  return (
    <button type="button" className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
      {label}
    </button>
  )
}

function PreviewIntro({ runner }: { runner: RunnerConfig }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{runner.intro}</p>
      <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{runner.title}</h4>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{runner.subtitle}</p>
      <div className="flex items-center justify-between border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span>Estimated time: {runner.estimated_minutes} min</span>
        <ButtonShell label={runner.start_cta_label} />
      </div>
    </div>
  )
}

function PreviewQuestion({ runner }: { runner: RunnerConfig }) {
  const progressCopy =
    runner.progress_style === 'steps'
      ? 'Step 2 of 18'
      : runner.progress_style === 'percent'
        ? '11% complete'
        : 'Progress bar visible'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{progressCopy}</span>
        {runner.show_dimension_badges ? <Chip>Openness</Chip> : null}
      </div>
      <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          I feel comfortable piloting AI-supported workflows with my team.
        </p>
        <div className="mt-3 grid grid-cols-5 gap-1.5 text-[11px]">
          {['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'].map((item) => (
            <div key={item} className="rounded border border-zinc-200 px-1.5 py-2 text-center text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PreviewCompletion({ runner }: { runner: RunnerConfig }) {
  return (
    <div className="space-y-3">
      <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{runner.completion_screen_title}</h4>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{runner.completion_screen_body}</p>
      <ButtonShell label={runner.completion_screen_cta_label} />
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Links to: {runner.completion_screen_cta_href || '(not set)'}</p>
    </div>
  )
}

function PreviewReport({ report }: { report: ReportConfig }) {
  const sections = [
    report.show_overall_classification ? 'Overall profile' : null,
    report.show_dimension_scores ? 'Dimension summaries' : null,
    report.show_recommendations ? 'Recommendations' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-3">
      <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{report.title}</h4>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{report.subtitle}</p>
      <div className="flex flex-wrap gap-1.5">
        {sections.map((section) => (
          <Chip key={section}>{section}</Chip>
        ))}
        {sections.length === 0 ? <p className="text-xs text-zinc-500">No sections enabled.</p> : null}
      </div>
      <ButtonShell label={report.next_steps_cta_label} />
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Links to: {report.next_steps_cta_href || '(not set)'}</p>
    </div>
  )
}

export function ContextualPreview({
  runnerConfig,
  reportConfig,
  title = 'Experience preview',
  activeTab,
  onTabChange,
}: Props) {
  const [internalTab, setInternalTab] = useState<PreviewTabKey>('intro')
  const currentTab = activeTab ?? internalTab

  const runner = useMemo(() => normalizeRunnerConfig(runnerConfig), [runnerConfig])
  const report = useMemo(() => normalizeReportConfig(reportConfig), [reportConfig])

  const setTab = (tab: PreviewTabKey) => {
    if (onTabChange) onTabChange(tab)
    if (typeof activeTab === 'undefined') setInternalTab(tab)
  }

  return (
    <aside className="sticky top-6 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</p>
      <div
        role="tablist"
        aria-label="Preview tabs"
        className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/40"
      >
        {tabs.map((tab, idx) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={currentTab === tab.key}
            tabIndex={currentTab === tab.key ? 0 : -1}
            onClick={() => setTab(tab.key)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
              event.preventDefault()
              const dir = event.key === 'ArrowRight' ? 1 : -1
              const next = (idx + dir + tabs.length) % tabs.length
              setTab(tabs[next].key)
            }}
            className={`rounded-md px-3 py-2 text-xs font-medium ${
              currentTab === tab.key
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-100'
                : 'bg-transparent text-zinc-600 hover:bg-white/80 dark:text-zinc-300 dark:hover:bg-zinc-900/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
        {currentTab === 'intro' ? <PreviewIntro runner={runner} /> : null}
        {currentTab === 'question' ? <PreviewQuestion runner={runner} /> : null}
        {currentTab === 'completion' ? <PreviewCompletion runner={runner} /> : null}
        {currentTab === 'report' ? <PreviewReport report={report} /> : null}
      </div>
    </aside>
  )
}
