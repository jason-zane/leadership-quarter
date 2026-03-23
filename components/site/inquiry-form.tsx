'use client'

import { useState } from 'react'
import { TransitionLink } from '@/components/site/transition-link'
import { CONTACT_EMAIL_LABEL, MAILTO_GENERAL } from '@/utils/brand/contact'

const TOPIC_OPTIONS = [
  'Executive Search',
  'Leadership Assessment',
  'Succession Strategy',
  'AI Readiness & Enablement',
  'LQ8 Leadership',
  'LQ AI Readiness & Enablement',
  'Other',
]

export function InquiryForm() {
  const [name, setName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState('')
  const [topic, setTopic] = useState(TOPIC_OPTIONS[0])
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || !organisation.trim() || !message.trim()) {
      setError('Please complete your name, organisation, and inquiry details.')
      return
    }

    if (!isValidEmail(workEmail.trim())) {
      setError('Please enter a valid work email.')
      return
    }

    if (!consent) {
      setError('Please confirm consent so we can respond to your inquiry.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          workEmail,
          organisation,
          role,
          topic,
          message,
          consent,
        }),
      })

      const body = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        if (body?.error === 'rate_limited') {
          throw new Error('Too many requests. Please wait a minute and try again.')
        }
        throw new Error('Could not send your inquiry right now. Please try again.')
      }

      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not send your inquiry right now. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="site-card-strong p-7 md:p-9">
      <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">General inquiry</p>
      <h2 className="site-heading-section max-w-3xl font-serif text-[clamp(1.9rem,4vw,3rem)] text-[var(--site-text-primary)]">
        Start with context.
        <span className="block text-[var(--site-accent-strong)]">We will take it from there.</span>
      </h2>
      <p className="mt-4 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
        Share your search, assessment, succession, or framework priorities. We will respond with a clear first recommendation.
      </p>

      {submitted ? (
        <div className="site-card-sub mt-6 p-5">
          <p className="font-semibold text-[var(--site-text-primary)]">Thanks. Your inquiry has been received.</p>
          <p className="mt-1 text-sm text-[var(--site-text-body)]">
            We will review the context and respond within one to two business days.
          </p>
          <p className="mt-2 text-sm text-[var(--site-text-body)]">
            If the matter is time-sensitive, email{' '}
            <a href={MAILTO_GENERAL} className="font-medium text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4">
              {CONTACT_EMAIL_LABEL}
            </a>
            .
          </p>
        </div>
      ) : (
        <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="site-field mt-2"
              />
            </label>

            <label className="block">
              <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Work email</span>
              <input
                type="email"
                value={workEmail}
                onChange={(event) => setWorkEmail(event.target.value)}
                className="site-field mt-2"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Organisation</span>
              <input
                type="text"
                value={organisation}
                onChange={(event) => setOrganisation(event.target.value)}
                className="site-field mt-2"
              />
            </label>

            <label className="block">
              <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Role (optional)</span>
              <input
                type="text"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="site-field mt-2"
              />
            </label>
          </div>

          <label className="block">
            <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Topic</span>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="site-field mt-2"
            >
              {TOPIC_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">What are you solving?</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
              className="site-field mt-2"
            />
          </label>

          <label className="flex items-start gap-2.5 text-sm text-[var(--site-text-body)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--site-border)]"
            />
            <span>
              I agree that Leadership Quarter may use this information to respond to this inquiry, in line with the{' '}
              <TransitionLink
                href="/privacy"
                className="font-medium text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4"
              >
                Privacy Policy
              </TransitionLink>
              .
            </span>
          </label>

          {error ? <p className="text-sm text-[var(--site-error)]">{error}</p> : null}
          {error ? (
            <p className="text-sm text-[var(--site-text-body)]">
              If this continues, email{' '}
              <a href={MAILTO_GENERAL} className="font-medium text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4">
                {CONTACT_EMAIL_LABEL}
              </a>
              .
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
            >
              {isSubmitting ? 'Sending...' : 'Send inquiry'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
