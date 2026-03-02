'use client'

import { useState } from 'react'

export function Lq8ReportDownloadForm() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [workEmail, setWorkEmail] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [role, setRole] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

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
      setError('Please confirm consent so we can send follow-up context.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/reports/lq8/request-download', {
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
        | { error?: string; downloadUrl?: string }
        | null

      if (!response.ok) {
        if (body?.error === 'rate_limited') {
          throw new Error('Too many requests. Please wait a minute and try again.')
        }
        if (body?.error === 'report_unavailable') {
          throw new Error('The report is temporarily unavailable. Please try again shortly.')
        }
        throw new Error('Could not process your request right now. Please try again.')
      }

      if (!body?.downloadUrl) {
        throw new Error('Download link could not be generated. Please try again.')
      }

      setUnlocked(true)
      setDownloadUrl(body.downloadUrl)
      window.location.assign(body.downloadUrl)
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
        <span>I agree to be contacted with relevant LQ8 updates.</span>
      </label>

      {error ? <p className="text-sm text-[#9f3a2f]">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
        >
          {isSubmitting ? 'Preparing download...' : unlocked ? 'Details confirmed' : 'Unlock report'}
        </button>

        {downloadUrl ? (
          <a
            href={downloadUrl}
            className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-8 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
          >
            Download full report (PDF)
          </a>
        ) : (
          <span className="font-cta pointer-events-none rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] bg-[var(--site-surface-soft)] px-8 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-muted)]">
            Download full report (PDF)
          </span>
        )}
      </div>
    </form>
  )
}
