'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { RunnerConfig } from '@/utils/assessments/experience-config'
import {
  normalizeAssessmentExperienceConfig,
  type AssessmentExperienceConfig,
} from '@/utils/assessments/assessment-experience-config'
import type { RuntimeAssessmentScale } from '@/utils/services/assessment-runtime-content'
import {
  AssessmentCompletionPanel,
  AssessmentFinalisingPanel,
  AssessmentOpeningPanel,
  AssessmentQuestionPanelHeader,
} from '@/components/assess/assessment-experience-panels'

type Question = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
}

type Assessment = {
  id: string
  key: string
  name: string
  description: string | null
  version?: number
}

type RunnerProps = {
  assessment: Assessment
  questions: Question[]
  runnerConfig: RunnerConfig
  scale?: RuntimeAssessmentScale
  submitEndpoint: string
  onResponsesReady?: (responses: Record<string, number>) => void | Promise<void>
  headerContext?: {
    label?: string
    value: string
  } | null
  runtimeMode?: 'default' | 'v2'
  v2ExperienceConfig?: AssessmentExperienceConfig
}

function isLikertValue(value: unknown, scalePoints: number): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= scalePoints
}

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = temp
  }
  return copy
}

function formatAssessmentDate(value: Date) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(value)
}

export function AssessmentRunner({
  assessment,
  questions,
  runnerConfig,
  scale: runtimeScale,
  submitEndpoint,
  onResponsesReady,
  headerContext = null,
  runtimeMode = 'default',
  v2ExperienceConfig,
}: RunnerProps) {
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [questionOrder, setQuestionOrder] = useState<string[]>([])
  const [responses, setResponses] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [completedNoReport, setCompletedNoReport] = useState(false)
  const [reportReadyPath, setReportReadyPath] = useState<string | null>(null)
  const advanceTimerRef = useRef<number | null>(null)
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null)

  const questionByKey = useMemo(
    () => new Map(questions.map((question) => [question.question_key, question] as const)),
    [questions]
  )

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.sort_order - b.sort_order),
    [questions]
  )

  const orderedQuestions = useMemo(() => {
    if (questionOrder.length === 0) return sortedQuestions
    return questionOrder.map((key) => questionByKey.get(key)).filter((question): question is Question => Boolean(question))
  }, [questionByKey, questionOrder, sortedQuestions])

  const current = orderedQuestions[index]
  const scale = useMemo(() => {
    const points = runtimeScale?.points && runtimeScale.points >= 2 ? runtimeScale.points : 5
    const labels = runtimeScale?.labels?.length === points
      ? runtimeScale.labels
      : ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'].slice(0, points)

    return Array.from({ length: points }, (_, index) => ({
      value: index + 1,
      label: labels[index] ?? `Option ${index + 1}`,
    }))
  }, [runtimeScale])
  const todayLabel = useMemo(() => formatAssessmentDate(new Date()), [])
  const totalQuestions = orderedQuestions.length
  const questionNumber = totalQuestions === 0 ? 0 : Math.min(index + 1, totalQuestions)
  const progressPercent = !started || totalQuestions === 0
    ? 0
    : submitting || reportReadyPath || completedNoReport
      ? 100
      : Math.round((questionNumber / totalQuestions) * 100)
  const headerLabel = runnerConfig.title?.trim() || assessment.name
  const headerSummary = headerContext?.value?.trim()
    ? [headerContext.label?.trim(), headerContext.value.trim()].filter(Boolean).join(' · ')
    : null
  const experienceConfig = useMemo(
    () => normalizeAssessmentExperienceConfig(v2ExperienceConfig),
    [v2ExperienceConfig]
  )

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!started || !current || advancing) return
    questionHeadingRef.current?.focus()
  }, [advancing, current, started])

  function renderShell(content: ReactNode, options?: { showProgress?: boolean; hideHeader?: boolean }) {
    if (runtimeMode === 'v2') {
      return (
        <div className="space-y-4">
          {!options?.hideHeader ? (
            <section className="assess-v2-runtime-header">
              <div>
                <p className="assess-v2-runtime-header-kicker">Assessment</p>
                <h1 className="assess-v2-runtime-header-title">{headerLabel}</h1>
              </div>
              <div className="assess-v2-runtime-header-meta">
                <p>{todayLabel}</p>
                {headerSummary ? <p>{headerSummary}</p> : null}
              </div>

              {options?.showProgress ? (
                <div className="assess-progress" aria-hidden="true">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
              ) : null}
            </section>
          ) : null}

          {content}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <section className="site-card-strong assess-header overflow-hidden px-5 py-7 md:px-7 md:py-8">
          <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Assessment</p>
          <h1 className="site-heading-display assess-header-title font-serif text-[clamp(2rem,4.3vw,3.35rem)] text-[var(--site-text-primary)]">
            {headerLabel}
          </h1>
          <div className="assess-header-meta">
            <p>{todayLabel}</p>
            {headerSummary ? <p>{headerSummary}</p> : null}
          </div>

          {options?.showProgress ? (
            <div className="assess-progress" aria-hidden="true">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          ) : null}
        </section>

        {content}
      </div>
    )
  }

  function startSurvey() {
    const randomized = shuffle(sortedQuestions.map((question) => question.question_key))
    setQuestionOrder(randomized)
    setIndex(0)
    setResponses({})
    setError(null)
    setStarted(true)
  }

  async function finalizeResponses(payloadResponses: Record<string, number>) {
    if (onResponsesReady) {
      setError(null)
      try {
        await onResponsesReady(payloadResponses)
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Could not continue.')
      } finally {
        setAdvancing(false)
      }
      return
    }

    await submit(payloadResponses)
  }

  function answer(value: number) {
    if (!current) return
    if (submitting || advancing) return

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    const nextResponses = { ...responses, [current.question_key]: value }
    setResponses(nextResponses)
    setAdvancing(true)
    setError(null)

    if (index < orderedQuestions.length - 1) {
      advanceTimerRef.current = window.setTimeout(() => {
        setIndex((prev) => prev + 1)
        setAdvancing(false)
        advanceTimerRef.current = null
      }, 120)
      return
    }
    advanceTimerRef.current = window.setTimeout(() => {
      void finalizeResponses(nextResponses)
      advanceTimerRef.current = null
    }, 120)
  }

  function back() {
    setError(null)
    if (index > 0) setIndex((prev) => prev - 1)
  }

  async function submit(nextResponses?: Record<string, number>) {
    const payloadResponses = nextResponses ?? responses
    const missing = orderedQuestions.some((question) => !isLikertValue(payloadResponses[question.question_key], scale.length))
    if (missing) {
      setError('Please complete all questions before submitting.')
      setAdvancing(false)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(submitEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: payloadResponses }),
      })

      const body = (await res.json().catch(() => null)) as
        | {
            ok?: boolean
            error?: string
            message?: string
            reportPath?: string
            reportAccessToken?: string
            nextStep?: 'contact_gate' | 'complete_no_report'
            gatePath?: string
          }
        | null

      if (!res.ok || !body?.ok) {
        throw new Error(body?.message ?? body?.error ?? 'Could not submit assessment.')
      }

      if (body.reportPath && body.reportAccessToken && !runnerConfig.data_collection_only) {
        setReportReadyPath(`${body.reportPath}?access=${encodeURIComponent(body.reportAccessToken)}`)
        setSubmitting(false)
        setAdvancing(false)
        return
      }

      if (body.nextStep === 'contact_gate' && body.gatePath && !runnerConfig.data_collection_only) {
        window.location.assign(body.gatePath)
        return
      }

      if (body.nextStep === 'complete_no_report' || runnerConfig.data_collection_only) {
        setCompletedNoReport(true)
        setSubmitting(false)
        setAdvancing(false)
        return
      }

      throw new Error('Assessment submitted but next step is unavailable.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit assessment.')
      setAdvancing(false)
      setSubmitting(false)
    }
  }

  if (completedNoReport) {
    if (runtimeMode === 'v2') {
      return renderShell(
        <AssessmentCompletionPanel
          title={runnerConfig.completion_screen_title}
          body={runnerConfig.completion_screen_body}
          cta={runnerConfig.completion_screen_cta_label}
          action={(
            <Link href={runnerConfig.completion_screen_cta_href} className="assess-v2-primary-btn inline-flex items-center justify-center">
              {runnerConfig.completion_screen_cta_label}
            </Link>
          )}
        />,
        { showProgress: true }
      )
    }

    return renderShell(
      <section className="assess-card">
        <p className="assess-kicker">Assessment complete</p>
        <h2 className="assess-title">{runnerConfig.completion_screen_title}</h2>
        <p className="assess-subtitle">{runnerConfig.completion_screen_body}</p>
        <div className="assess-actions">
          <Link href={runnerConfig.completion_screen_cta_href} className="assess-primary-btn inline-flex items-center justify-center">
            {runnerConfig.completion_screen_cta_label}
          </Link>
        </div>
      </section>,
      { showProgress: true }
    )
  }

  if (reportReadyPath) {
    if (runtimeMode === 'v2') {
      return renderShell(
        <AssessmentCompletionPanel
          title="Your results are ready"
          body="We have finished processing your responses. Continue to view your full assessment report."
          cta="Open results"
          action={(
            <button
              type="button"
              onClick={() => window.location.assign(reportReadyPath)}
              className="assess-v2-primary-btn inline-flex items-center justify-center"
            >
              Open results
            </button>
          )}
        />,
        { showProgress: true }
      )
    }

    return renderShell(
      <section className="assess-card">
        <p className="assess-kicker">Assessment complete</p>
        <h2 className="assess-title">Your results are ready</h2>
        <p className="assess-subtitle">
          We&apos;ve finished processing your responses. Continue to view your full assessment report.
        </p>
        <div className="assess-actions">
          <button
            type="button"
            onClick={() => window.location.assign(reportReadyPath)}
            className="assess-primary-btn inline-flex items-center justify-center"
          >
            Open results
          </button>
        </div>
      </section>,
      { showProgress: true }
    )
  }

  if (submitting) {
    if (runtimeMode === 'v2') {
      return renderShell(<AssessmentFinalisingPanel experienceConfig={experienceConfig} />, {
        showProgress: true,
      })
    }

    return renderShell(
      <section className="assess-card assess-card-tight">
        <p className="assess-kicker">Finalising assessment</p>
        <h2 className="assess-title">Generating your results</h2>
        <p className="assess-subtitle">
          We&apos;re scoring your responses and preparing the next step now.
        </p>
        <div className="assess-processing">
          <span className="assess-processing-dot" />
          <span className="assess-processing-dot" />
          <span className="assess-processing-dot" />
        </div>
        <div className="assess-actions">
          <button type="button" disabled className="assess-primary-btn inline-flex items-center justify-center">
            Generating results...
          </button>
        </div>
      </section>,
      { showProgress: true }
    )
  }

  if (!started) {
    if (runtimeMode === 'v2') {
      return renderShell(
        <AssessmentOpeningPanel
          runnerConfig={runnerConfig}
          experienceConfig={experienceConfig}
          title={headerLabel}
          subtitle={runnerConfig.subtitle || assessment.description || ''}
          intro={runnerConfig.intro}
          contextLabel={headerSummary}
          ctaLabel={runnerConfig.start_cta_label}
          onCtaClick={startSurvey}
        />,
        { hideHeader: true }
      )
    }

    return renderShell(
      <section className="assess-card">
        <p className="assess-kicker">Before you begin</p>
        <p className="assess-subtitle">{runnerConfig.subtitle || assessment.description || ''}</p>
        <div className="assess-intro-grid">
          <article className="assess-intro-item">
            <p className="assess-intro-label">Purpose</p>
            <p className="assess-intro-copy">
              Capture your perspective quickly, clearly, and consistently so your report reflects practical readiness.
            </p>
          </article>
          <article className="assess-intro-item">
            <p className="assess-intro-label">Time</p>
            <p className="assess-intro-copy">Estimated completion time is about {runnerConfig.estimated_minutes} minutes.</p>
          </article>
          <article className="assess-intro-item">
            <p className="assess-intro-label">How it works</p>
            <p className="assess-intro-copy">
              You will answer one prompt at a time. Selecting a response moves you straight to the next item.
            </p>
          </article>
          <article className="assess-intro-item">
            <p className="assess-intro-label">After completion</p>
            <p className="assess-intro-copy">
              You will be taken directly to your report with your current profile and recommended focus areas.
            </p>
          </article>
        </div>
        <div className="assess-intro-cta">
          <button type="button" onClick={startSurvey} className="assess-primary-btn">
            {runnerConfig.start_cta_label}
          </button>
        </div>
      </section>
    )
  }

  if (!current) {
    return renderShell(
      <section className="assess-card">
        <p className="assess-subtitle">No questions available for this assessment.</p>
      </section>
    )
  }

  return renderShell(
    <section className={[
      runtimeMode === 'v2' ? 'assess-v2-question-shell' : 'assess-card',
      'assess-card-tight',
      'assess-question-card',
      advancing ? 'assess-question-card-advancing' : '',
    ].join(' ')}>
      <div className="assess-question-stage">
        {runtimeMode === 'v2' ? <AssessmentQuestionPanelHeader experienceConfig={experienceConfig} /> : null}
        <h2 ref={questionHeadingRef} className="assess-question" tabIndex={-1}>
          {current.text}
        </h2>

        <div className="assess-scale">
          {scale.map((option) => {
            const selected = !advancing && responses[current.question_key] === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => answer(option.value)}
                className={['assess-option', selected ? 'assess-option-selected' : ''].filter(Boolean).join(' ')}
                disabled={advancing}
              >
                <span className="assess-option-value">{option.value}</span>
                <span className="assess-option-label">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {error ? <p className="assess-error">{error}</p> : null}

      <div className={runtimeMode === 'v2' ? 'assess-actions assess-question-actions assess-v2-question-actions' : 'assess-actions assess-question-actions'}>
        <button
          type="button"
          onClick={back}
          className={runtimeMode === 'v2' ? 'assess-v2-secondary-btn' : 'assess-secondary-btn'}
          disabled={index === 0 || advancing}
        >
          Back
        </button>
      </div>
    </section>,
    { showProgress: true }
  )
}
