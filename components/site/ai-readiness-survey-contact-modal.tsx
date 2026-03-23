'use client'

import { useEffect, useState } from 'react'

export type AiReadinessContactDetails = {
  firstName: string
  lastName: string
  workEmail: string
  organisation: string
  role: string
  consent: boolean
}

type Props = {
  open: boolean
  isSubmitting: boolean
  submitError: string | null
  onClose: () => void
  onSubmit: (details: AiReadinessContactDetails) => Promise<void>
}

export function AiReadinessSurveyContactModal({
  open,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: Props) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState('')
  const [consent, setConsent] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [open, isSubmitting, onClose])

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    const normalized = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      workEmail: workEmail.trim(),
      organisation: organisation.trim(),
      role: role.trim(),
      consent,
    }

    if (!normalized.firstName || !normalized.lastName || !normalized.organisation || !normalized.role) {
      setLocalError('Please complete your name, organisation, and role.')
      return
    }

    if (!isValidEmail(normalized.workEmail)) {
      setLocalError('Please enter a valid work email.')
      return
    }

    if (!normalized.consent) {
      setLocalError('Please confirm consent before continuing.')
      return
    }

    await onSubmit(normalized)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(10,17,26,0.45)] p-4 backdrop-blur-sm"
      onClick={() => {
        if (!isSubmitting) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="site-card-strong relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-7 md:p-9"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close contact details modal"
          onClick={onClose}
          disabled={isSubmitting}
          className="font-cta absolute right-4 top-4 rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-3 py-1.5 text-xs font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)] disabled:opacity-60"
        >
          Close
        </button>

        <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          Almost done
        </p>
        <h3 className="site-heading-section max-w-3xl font-serif text-[clamp(1.7rem,4vw,2.8rem)] text-[var(--site-text-primary)]">
          Access your AI Readiness report
        </h3>
        <p className="mt-4 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
          Fill in your details and we will generate your personal report immediately.
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">First name</span>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="site-field mt-2"
                disabled={isSubmitting}
              />
            </label>

            <label className="block">
              <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Last name</span>
              <input
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="site-field mt-2"
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Work email</span>
              <input
                type="email"
                value={workEmail}
                onChange={(event) => setWorkEmail(event.target.value)}
                className="site-field mt-2"
                disabled={isSubmitting}
              />
            </label>

            <label className="block">
              <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Organisation</span>
              <input
                type="text"
                value={organisation}
                onChange={(event) => setOrganisation(event.target.value)}
                className="site-field mt-2"
                disabled={isSubmitting}
              />
            </label>
          </div>

          <label className="block">
            <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Role</span>
            <input
              type="text"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="site-field mt-2"
              disabled={isSubmitting}
            />
          </label>

          <label className="flex items-start gap-2.5 text-sm text-[var(--site-text-body)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--site-border)]"
              disabled={isSubmitting}
            />
            <span>I agree to be contacted with relevant AI Readiness updates.</span>
          </label>

          {localError ? <p className="text-sm text-[var(--site-error)]">{localError}</p> : null}
          {submitError ? <p className="text-sm text-[var(--site-error)]">{submitError}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)] disabled:opacity-60"
          >
            {isSubmitting ? 'Preparing your report...' : 'Get my AI Readiness report'}
          </button>
        </form>
      </div>
    </div>
  )
}
