'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AiReadinessSurveyContactModal,
  type AiReadinessContactDetails,
} from '@/components/site/ai-readiness-survey-contact-modal'

type LikertValue = 1 | 2 | 3 | 4 | 5

type SurveyQuestion = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
}

type AssessmentApiPayload = {
  ok?: boolean
  assessment?: {
    id: string
    key: string
    name: string
    description: string | null
    version: number
  }
  questions?: SurveyQuestion[]
  invitation?: {
    firstName?: string | null
    lastName?: string | null
    organisation?: string | null
    role?: string | null
  }
  error?: string
}

type Props = {
  surveyKey?: string
  invitationToken?: string
  initialData?: AssessmentApiPayload | null
}

const likertScale: Array<{ value: LikertValue; label: string }> = [
  { value: 1, label: 'Strongly disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly agree' },
]

function storageKey(base: string, key: string) {
  return `${base}:${key}`
}

function shuffleKeys(keys: readonly string[]): string[] {
  const copy = [...keys]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = temp
  }
  return copy
}

function isLikertValue(value: unknown): value is LikertValue {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5
}

export function AiReadinessSurveyForm({
  surveyKey = 'ai_readiness_orientation_v1',
  invitationToken,
  initialData = null,
}: Props) {
  const sessionNamespace = invitationToken ? `invite:${invitationToken}` : `public:${surveyKey}`

  const STORAGE_STARTED = storageKey('ai-readiness-survey-started', sessionNamespace)
  const STORAGE_ORDER = storageKey('ai-readiness-survey-order', sessionNamespace)
  const STORAGE_RESPONSES = storageKey('ai-readiness-survey-responses', sessionNamespace)
  const STORAGE_INDEX = storageKey('ai-readiness-survey-index', sessionNamespace)

  const [isLoading, setIsLoading] = useState(!initialData)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])

  const [hasStarted, setHasStarted] = useState(false)
  const [questionOrder, setQuestionOrder] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, LikertValue>>({})

  const [error, setError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const questionByKey = useMemo(
    () => new Map(questions.map((question) => [question.question_key, question] as const)),
    [questions]
  )

  const orderedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => a.sort_order - b.sort_order)
  }, [questions])

  useEffect(() => {
    let active = true

    async function load() {
      if (initialData) {
        if (!active) return
        if (!initialData.ok || !initialData.questions) {
          setLoadError('We could not load this survey right now.')
          setIsLoading(false)
          return
        }
        setQuestions(initialData.questions)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError(null)

      const endpoint = invitationToken
        ? `/api/assessments/invitation/${encodeURIComponent(invitationToken)}`
        : `/api/assessments/public/${encodeURIComponent(surveyKey)}`

      const response = await fetch(endpoint, { cache: 'no-store' }).catch(() => null)
      const body = (await response?.json().catch(() => null)) as AssessmentApiPayload | null

      if (!active) return

      if (!response?.ok || !body?.ok || !Array.isArray(body.questions) || body.questions.length === 0) {
        if (body?.error === 'invitation_expired') {
          setLoadError('This invitation has expired.')
        } else if (body?.error === 'invitation_completed') {
          setLoadError('This invitation has already been completed.')
        } else {
          setLoadError('We could not load this survey right now.')
        }
        setIsLoading(false)
        return
      }

      setQuestions(body.questions)
      setIsLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [initialData, invitationToken, surveyKey])

  useEffect(() => {
    if (isLoading || questions.length === 0) return

    try {
      const started = sessionStorage.getItem(STORAGE_STARTED) === '1'
      const savedOrderRaw = sessionStorage.getItem(STORAGE_ORDER)
      const savedResponsesRaw = sessionStorage.getItem(STORAGE_RESPONSES)
      const savedIndexRaw = sessionStorage.getItem(STORAGE_INDEX)

      if (!started || !savedOrderRaw) return

      const validKeys = new Set(questions.map((question) => question.question_key))
      const parsedOrder = JSON.parse(savedOrderRaw) as string[]
      const validOrder = parsedOrder.filter((key) => validKeys.has(key))
      if (validOrder.length !== questions.length) return

      let parsedResponses: Record<string, LikertValue> = {}
      if (savedResponsesRaw) {
        const raw = JSON.parse(savedResponsesRaw) as Record<string, unknown>
        parsedResponses = Object.entries(raw).reduce(
          (acc, [key, value]) => {
            if (validKeys.has(key) && isLikertValue(value)) {
              acc[key] = value
            }
            return acc
          },
          {} as Record<string, LikertValue>
        )
      }

      let index = Number(savedIndexRaw ?? 0)
      if (!Number.isFinite(index) || index < 0) index = 0
      if (index > validOrder.length - 1) index = validOrder.length - 1

      setHasStarted(true)
      setQuestionOrder(validOrder)
      setResponses(parsedResponses)
      setCurrentIndex(index)
    } catch {
      // Ignore malformed session data and start fresh.
    }
  }, [questions, isLoading, STORAGE_INDEX, STORAGE_ORDER, STORAGE_RESPONSES, STORAGE_STARTED])

  useEffect(() => {
    if (!hasStarted || isLoading) return

    sessionStorage.setItem(STORAGE_STARTED, '1')
    sessionStorage.setItem(STORAGE_ORDER, JSON.stringify(questionOrder))
    sessionStorage.setItem(STORAGE_RESPONSES, JSON.stringify(responses))
    sessionStorage.setItem(STORAGE_INDEX, String(currentIndex))
  }, [
    STORAGE_INDEX,
    STORAGE_ORDER,
    STORAGE_RESPONSES,
    STORAGE_STARTED,
    currentIndex,
    hasStarted,
    isLoading,
    questionOrder,
    responses,
  ])

  function clearSurveySession() {
    sessionStorage.removeItem(STORAGE_STARTED)
    sessionStorage.removeItem(STORAGE_ORDER)
    sessionStorage.removeItem(STORAGE_RESPONSES)
    sessionStorage.removeItem(STORAGE_INDEX)
  }

  function startSurvey() {
    const keys = orderedQuestions.map((question) => question.question_key)
    const orderedKeys = invitationToken ? keys : shuffleKeys(keys)

    setHasStarted(true)
    setQuestionOrder(orderedKeys)
    setCurrentIndex(0)
    setResponses({})
    setError(null)
    setSubmitError(null)
    setContactOpen(false)
  }

  function goBack() {
    setError(null)
    if (currentIndex === 0) return
    setCurrentIndex((prev) => prev - 1)
  }

  function answerCurrentQuestion(value: LikertValue) {
    const currentKey = questionOrder[currentIndex]
    if (!currentKey) return

    setResponses((prev) => ({ ...prev, [currentKey]: value }))
    setError(null)

    if (currentIndex >= questionOrder.length - 1) return

    window.setTimeout(() => {
      setCurrentIndex((prev) => Math.min(prev + 1, questionOrder.length - 1))
    }, 120)
  }

  function openSubmitStep() {
    const missing = questionOrder.filter((key) => !responses[key])
    if (missing.length > 0) {
      setError('Please complete all questions before submitting.')
      return
    }

    if (invitationToken) {
      void submitInvitation()
      return
    }

    setError(null)
    setContactOpen(true)
  }

  async function submitInvitation() {
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/assessments/invitation/${encodeURIComponent(invitationToken ?? '')}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })

      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean
            error?: string
            message?: string
            reportPath?: string
            reportAccessToken?: string
          }
        | null

      if (!response.ok || !body?.ok || !body.reportPath || !body.reportAccessToken) {
        if (body?.error === 'invitation_expired') {
          throw new Error('This invitation has expired.')
        }
        if (body?.error === 'invitation_completed') {
          throw new Error('This invitation has already been completed.')
        }
        throw new Error(body?.message || 'We could not generate your report right now. Please try again.')
      }

      clearSurveySession()
      const url = `${body.reportPath}?access=${encodeURIComponent(body.reportAccessToken)}`
      window.location.assign(url)
    } catch (submitFailure) {
      setSubmitError(
        submitFailure instanceof Error
          ? submitFailure.message
          : 'We could not generate your report right now. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitWithContact(details: AiReadinessContactDetails) {
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/assessments/ai-readiness/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...details,
          responses,
        }),
      })

      const body = (await response.json().catch(() => null)) as
        | {
            ok?: boolean
            error?: string
            message?: string
            reportPath?: string
            reportAccessToken?: string
          }
        | null

      if (!response.ok || !body?.ok || !body.reportPath || !body.reportAccessToken) {
        if (body?.error === 'rate_limited') {
          throw new Error('Too many requests. Please wait a minute and try again.')
        }
        if (body?.error === 'invalid_origin') {
          throw new Error('Request blocked by origin policy. Refresh the page and try again.')
        }
        if (body?.error === 'invalid_fields') {
          throw new Error('Please review your contact details and try again.')
        }
        if (body?.error === 'invalid_responses') {
          throw new Error('Survey responses were invalid. Please restart the survey.')
        }
        throw new Error(body?.message || 'We could not generate your report right now. Please try again.')
      }

      clearSurveySession()
      const url = `${body.reportPath}?access=${encodeURIComponent(body.reportAccessToken)}`
      window.location.assign(url)
    } catch (submitFailure) {
      setSubmitError(
        submitFailure instanceof Error
          ? submitFailure.message
          : 'We could not generate your report right now. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <section className="site-card-strong p-6 md:p-8">
        <p className="text-sm text-[var(--site-text-body)]">Loading survey questions...</p>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="site-card-strong p-6 md:p-8">
        <p className="text-sm text-[#9f3a2f]">{loadError}</p>
      </section>
    )
  }

  if (!hasStarted) {
    return (
      <section className="site-card-strong p-6 md:p-8">
        <h2 className="font-serif text-[clamp(1.8rem,4vw,3rem)] leading-[1.06] text-[var(--site-text-primary)]">
          Ready to start?
        </h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
          This is a short survey that should take about 5 minutes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startSurvey}
            className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-10 py-4 text-base font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
          >
            Begin survey
          </button>
        </div>
      </section>
    )
  }

  const currentKey = questionOrder[currentIndex]
  const currentQuestion = currentKey ? questionByKey.get(currentKey) : null
  const currentValue = currentKey ? responses[currentKey] : undefined
  const progress = Math.round(((currentIndex + 1) / Math.max(questionOrder.length, 1)) * 100)

  return (
    <>
      <section className="site-card-strong p-6 md:p-8">
        <div className="h-2 rounded-full bg-[var(--site-surface-alt)]">
          <div
            className="h-2 rounded-full bg-[var(--site-primary)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h3 className="mt-8 font-serif text-[clamp(1.6rem,3.2vw,2.6rem)] leading-[1.14] text-[var(--site-text-primary)]">
          {currentQuestion?.text}
        </h3>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-5 md:gap-2">
          {likertScale.map((option) => {
            const selected = currentValue === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => answerCurrentQuestion(option.value)}
                className={[
                  'rounded-2xl border px-5 py-4 text-left transition-colors',
                  'md:flex md:flex-col md:items-center md:justify-center md:px-3 md:py-5 md:text-center',
                  selected
                    ? 'border-[var(--site-primary)] bg-[var(--site-primary)]/10 text-[var(--site-text-primary)]'
                    : 'border-[var(--site-border)] bg-[var(--site-surface-elevated)] text-[var(--site-text-body)] hover:bg-[var(--site-surface-alt)]',
                ].join(' ')}
              >
                <span className="font-ui text-sm font-medium">{option.label}</span>
              </button>
            )
          })}
        </div>

        {error ? <p className="mt-4 text-sm text-[#9f3a2f]">{error}</p> : null}
        {submitError ? <p className="mt-2 text-sm text-[#9f3a2f]">{submitError}</p> : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={currentIndex === 0 || isSubmitting}
            className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-6 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)] disabled:opacity-50"
          >
            Back
          </button>

          {currentIndex === questionOrder.length - 1 ? (
            <button
              type="button"
              onClick={openSubmitStep}
              disabled={isSubmitting}
              className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)] disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Finish & view report'}
            </button>
          ) : null}
        </div>
      </section>

      {!invitationToken ? (
        <AiReadinessSurveyContactModal
          open={contactOpen}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onClose={() => setContactOpen(false)}
          onSubmit={submitWithContact}
        />
      ) : null}
    </>
  )
}
