'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type GateContextResponse = {
  ok?: boolean
  error?: string
  context?: {
    campaignName?: string | null
    assessmentName?: string | null
  }
}

type UnlockResponse = {
  ok?: boolean
  error?: string
  reportPath?: string
  reportAccessToken?: string
}

type ContactFields = {
  firstName: string
  lastName: string
  workEmail: string
  organisation: string
  role: string
  consent: boolean
}

const EMPTY_FIELDS: ContactFields = {
  firstName: '',
  lastName: '',
  workEmail: '',
  organisation: '',
  role: '',
  consent: false,
}

export default function AssessmentContactGatePage() {
  const searchParams = useSearchParams()
  const gateToken = searchParams.get('gate')

  const [fields, setFields] = useState<ContactFields>(EMPTY_FIELDS)
  const [context, setContext] = useState<{ campaignName?: string | null; assessmentName?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!gateToken) {
        setError('This link is invalid or missing.')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/assessments/contact-gate/${encodeURIComponent(gateToken)}`, {
        cache: 'no-store',
      }).catch(() => null)

      const body = (await response?.json().catch(() => null)) as GateContextResponse | null
      if (!mounted) return

      if (!response?.ok || !body?.ok) {
        setError('This assessment access link has expired. Please restart the assessment.')
        setLoading(false)
        return
      }

      setContext(body.context ?? null)
      setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [gateToken])

  function setField<Key extends keyof ContactFields>(key: Key, value: ContactFields[Key]) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!gateToken) {
      setError('This link is invalid or missing.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/assessments/contact-gate/${encodeURIComponent(gateToken)}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })

      const body = (await response.json().catch(() => null)) as UnlockResponse | null
      if (!response.ok || !body?.ok || !body.reportPath || !body.reportAccessToken) {
        if (body?.error === 'invalid_fields') {
          throw new Error('Please complete all required fields and confirm consent.')
        }
        throw new Error('We could not unlock your report. Please try again.')
      }

      window.location.assign(`${body.reportPath}?access=${encodeURIComponent(body.reportAccessToken)}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not unlock your report.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="assess-card">
        <p className="assess-subtitle">Loading...</p>
      </section>
    )
  }

  if (error && !context) {
    return (
      <section className="assess-card">
        <p className="assess-kicker">Assessment</p>
        <h1 className="assess-title">Access expired</h1>
        <p className="assess-subtitle">{error}</p>
      </section>
    )
  }

  return (
    <section className="assess-card">
      <p className="assess-kicker">{context?.campaignName ?? 'Assessment'}</p>
      <h1 className="assess-title">One final step before your report</h1>
      <p className="assess-subtitle">
        Complete your contact details to unlock your {context?.assessmentName ?? 'assessment'} results.
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[var(--site-text-primary)]">First name</span>
            <input
              value={fields.firstName}
              onChange={(event) => setField('firstName', event.target.value)}
              className="rounded-xl border border-[var(--site-border)] bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[var(--site-text-primary)]">Last name</span>
            <input
              value={fields.lastName}
              onChange={(event) => setField('lastName', event.target.value)}
              className="rounded-xl border border-[var(--site-border)] bg-white px-3 py-2 text-sm"
              required
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-[var(--site-text-primary)]">Work email</span>
          <input
            type="email"
            value={fields.workEmail}
            onChange={(event) => setField('workEmail', event.target.value)}
            className="rounded-xl border border-[var(--site-border)] bg-white px-3 py-2 text-sm"
            required
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[var(--site-text-primary)]">Organisation</span>
            <input
              value={fields.organisation}
              onChange={(event) => setField('organisation', event.target.value)}
              className="rounded-xl border border-[var(--site-border)] bg-white px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[var(--site-text-primary)]">Role</span>
            <input
              value={fields.role}
              onChange={(event) => setField('role', event.target.value)}
              className="rounded-xl border border-[var(--site-border)] bg-white px-3 py-2 text-sm"
              required
            />
          </label>
        </div>

        <label className="mt-1 flex items-start gap-2 text-sm text-[var(--site-text-body)]">
          <input
            type="checkbox"
            checked={fields.consent}
            onChange={(event) => setField('consent', event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--site-border)]"
            required
          />
          <span>I agree to be contacted regarding assessment outcomes and related services.</span>
        </label>

        {error ? <p className="assess-error">{error}</p> : null}

        <div className="assess-actions">
          <button type="submit" className="assess-primary-btn" disabled={submitting}>
            {submitting ? 'Unlocking report...' : 'Unlock my report'}
          </button>
        </div>
      </form>
    </section>
  )
}
