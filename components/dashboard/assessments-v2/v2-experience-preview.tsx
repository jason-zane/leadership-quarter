'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DEFAULT_REPORT_CONFIG,
  normalizeReportConfig,
  normalizeRunnerConfig,
  type ReportConfig,
  type RunnerConfig,
} from '@/utils/assessments/experience-config'
import {
  normalizeAssessmentV2ExperienceConfig,
  type AssessmentV2ExperienceConfig,
} from '@/utils/assessments/v2-experience-config'
import {
  AssessmentV2CompletionPanel,
  AssessmentV2FinalisingPanel,
  AssessmentV2OpeningPanel,
  AssessmentV2PreviewAction,
  AssessmentV2QuestionPanelHeader,
} from '@/components/assess/v2-experience-panels'

const tabs = [
  { key: 'opening', label: 'Opening' },
  { key: 'question', label: 'Question' },
  { key: 'finalising', label: 'Finalising' },
  { key: 'completion', label: 'Completion' },
] as const

export type AssessmentV2PreviewTab = (typeof tabs)[number]['key']

type Props = {
  runnerConfig: RunnerConfig
  reportConfig?: ReportConfig
  experienceConfig: AssessmentV2ExperienceConfig
  activeTab?: AssessmentV2PreviewTab
  onTabChange?: (tab: AssessmentV2PreviewTab) => void
  fullWidth?: boolean
}

export function V2ExperiencePreview({
  runnerConfig,
  reportConfig = DEFAULT_REPORT_CONFIG,
  experienceConfig,
  activeTab,
  onTabChange,
  fullWidth = false,
}: Props) {
  const [internalTab, setInternalTab] = useState<AssessmentV2PreviewTab>('opening')
  const currentTab = activeTab ?? internalTab
  const runner = useMemo(() => normalizeRunnerConfig(runnerConfig), [runnerConfig])
  const report = useMemo(() => normalizeReportConfig(reportConfig), [reportConfig])
  const experience = useMemo(() => normalizeAssessmentV2ExperienceConfig(experienceConfig), [experienceConfig])

  function setTab(tab: AssessmentV2PreviewTab) {
    onTabChange?.(tab)
    if (typeof activeTab === 'undefined') {
      setInternalTab(tab)
    }
  }

  return (
    <div className={[
      fullWidth
        ? 'rounded-[1.75rem] border border-[rgba(99,122,150,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.94))] p-6 shadow-[0_24px_80px_rgba(36,53,78,0.08)]'
        : 'sticky top-6 rounded-[1.75rem] border border-[rgba(99,122,150,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.94))] p-5 shadow-[0_24px_80px_rgba(36,53,78,0.08)]',
    ].join(' ')}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-text-soft)]">Assessment view</p>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">Candidate-facing assessment states</p>
        </div>
        {!fullWidth ? (
          <Link
            href="#preview"
            className="rounded-full border border-[rgba(103,127,159,0.16)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--admin-text-primary)]"
          >
            View
          </Link>
        ) : null}
      </div>

      <div className="admin-toggle-group mt-4 overflow-x-auto" role="tablist" aria-label="Assessment view states">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            className={currentTab === tab.key ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={[
        'mt-5 rounded-[1.5rem] border border-[rgba(99,122,150,0.14)] bg-[radial-gradient(circle_at_top_left,rgba(232,240,249,0.8),rgba(255,255,255,0.98)_45%)]',
        fullWidth ? 'p-6' : 'p-4',
      ].join(' ')}>
        {currentTab === 'opening' ? (
          <AssessmentV2OpeningPanel
            runnerConfig={runner}
            experienceConfig={experience}
            title={runner.title}
            subtitle={runner.subtitle}
            intro={runner.intro}
            contextLabel={report.v2_runtime_enabled ? 'Assessment route enabled' : 'Assessment route disabled'}
            ctaLabel={runner.start_cta_label}
          />
        ) : null}

        {currentTab === 'question' ? (
          <section className="assess-v2-state-panel">
            <AssessmentV2QuestionPanelHeader experienceConfig={experience} />
            <div className="assess-v2-question-preview-card">
              <div className="assess-v2-question-preview-meta">
                <span>Question 4 of 18</span>
                <span>22% complete</span>
              </div>
              <h3>I can assess where AI will genuinely improve team output before investing more time in it.</h3>
              <div className="assess-v2-question-preview-options">
                {['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'].map((label, index) => (
                  <div key={label} className={index === 3 ? 'assess-v2-question-preview-option assess-v2-question-preview-option-active' : 'assess-v2-question-preview-option'}>
                    <span>{index + 1}</span>
                    <p>{label}</p>
                  </div>
                ))}
              </div>
              <div className="assess-v2-question-preview-actions">
                <AssessmentV2PreviewAction label="Back" secondary />
              </div>
            </div>
          </section>
        ) : null}

        {currentTab === 'finalising' ? <AssessmentV2FinalisingPanel experienceConfig={experience} /> : null}

        {currentTab === 'completion' ? (
          <AssessmentV2CompletionPanel
            title={runner.completion_screen_title}
            body={runner.completion_screen_body}
            cta={runner.completion_screen_cta_label}
            action={<AssessmentV2PreviewAction label={runner.completion_screen_cta_label} />}
          />
        ) : null}
      </div>
    </div>
  )
}
