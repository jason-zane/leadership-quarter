'use client'

import { useState } from 'react'

export function AiReadinessReportDownloadForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim() || !organisation.trim() || !role.trim()) {
      setError('Please complete your name, organisation, and role.')
      return
    }

    if (!isValidEmail(workEmail.trim())) {
      setError('Please enter a valid work email.')
      return
    }

    if (!consent) {
      setError('Please confirm consent so we can send relevant framework updates.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/reports/ai-readiness/request-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          workEmail,
          organisation,
          role,
          consent,
        }),
      })

      const body = (await response.json().catch(() => null)) as
        | {
            error?: string
            message?: string
            reportPath?: string
            reportAccessToken?: string
          }
        | null

      if (!response.ok) {
        if (body?.error === 'missing_report_secret') {
          throw new Error('Report access is being configured. Please try again shortly.')
        }
        if (body?.error === 'missing_service_role') {
          throw new Error('Server configuration is incomplete. Please contact support.')
        }
        if (body?.error === 'invalid_origin') {
          throw new Error('Request was blocked by origin security policy. Please refresh and try again.')
        }
        if (body?.error === 'rate_limited') {
          throw new Error('Too many requests. Please wait a minute and try again.')
        }
        if (body?.message) {
          throw new Error(body.message)
        }
        if (body?.error) {
          throw new Error(`Request failed: ${body.error}`)
        }
        throw new Error('Could not process your request right now. Please try again.')
      }

      if (body?.reportPath && body?.reportAccessToken) {
        setUnlocked(true)
        const reportUrl = `${body.reportPath}?access=${encodeURIComponent(body.reportAccessToken)}`
        window.location.assign(reportUrl)
        return
      }
      throw new Error('White paper access could not be generated. Please try again.')
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not process your request right now. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="site-field mt-2"
          />
        </label>

        <label className="block">
          <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="site-field mt-2"
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
          />
        </label>

        <label className="block">
          <span className="font-ui text-sm font-medium text-[var(--site-text-body)]">Organisation</span>
          <input
            type="text"
            value={organisation}
            onChange={(event) => setOrganisation(event.target.value)}
            className="site-field mt-2"
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
        />
      </label>

      <label className="flex items-start gap-2.5 text-sm text-[var(--site-text-body)]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-[var(--site-border)]"
        />
        <span>I agree to be contacted with relevant AI Readiness & Enablement updates.</span>
      </label>

      {error ? <p className="text-sm text-[var(--site-error)]">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
        >
          {isSubmitting ? 'Preparing access...' : unlocked ? 'Details confirmed' : 'Unlock white paper'}
        </button>
      </div>
    </form>
  )
}
