'use client'

import { useState } from 'react'
import type { CampaignConfig } from '@/utils/surveys/campaign-types'
import { DEMOGRAPHICS_FIELD_OPTIONS } from '@/utils/surveys/campaign-types'

type Props = {
  campaignSlug: string
  campaignConfig: CampaignConfig
  onRegistered: (token: string) => void
}

type FieldValues = {
  firstName: string
  lastName: string
  email: string
  organisation: string
  role: string
  demographics: Record<string, string>
}

export function CampaignRegistrationStep({ campaignSlug, campaignConfig, onRegistered }: Props) {
  const [fields, setFields] = useState<FieldValues>({
    firstName: '',
    lastName: '',
    email: '',
    organisation: '',
    role: '',
    demographics: {},
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField(key: keyof Omit<FieldValues, 'demographics'>, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function setDemographic(key: string, value: string) {
    setFields((prev) => ({ ...prev, demographics: { ...prev.demographics, [key]: value } }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch(`/api/surveys/campaigns/${encodeURIComponent(campaignSlug)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: fields.firstName,
          lastName: fields.lastName,
          email: fields.email,
          organisation: fields.organisation,
          role: fields.role,
          demographics: campaignConfig.demographics_enabled ? fields.demographics : {},
        }),
      })

      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; token?: string; surveyPath?: string }
        | null

      if (!res.ok || !body?.ok || !body.token) {
        if (body?.error === 'campaign_not_active') {
          throw new Error('This campaign is no longer accepting registrations.')
        }
        if (body?.error === 'invalid_fields') {
          throw new Error('Please check your details and try again.')
        }
        throw new Error('Registration failed. Please try again.')
      }

      onRegistered(body.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const demographicFields = campaignConfig.demographics_enabled
    ? DEMOGRAPHICS_FIELD_OPTIONS.filter((f) => campaignConfig.demographics_fields.includes(f.key))
    : []

  return (
    <section className="site-card-strong p-6 md:p-8">
      <h2 className="font-serif text-[clamp(1.8rem,4vw,3rem)] leading-[1.06] text-[var(--site-text-primary)]">
        Tell us about yourself
      </h2>
      <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
        Enter your details to begin the survey.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
              First name <span className="text-[#9f3a2f]">*</span>
            </label>
            <input
              value={fields.firstName}
              onChange={(e) => setField('firstName', e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
              Last name <span className="text-[#9f3a2f]">*</span>
            </label>
            <input
              value={fields.lastName}
              onChange={(e) => setField('lastName', e.target.value)}
              required
              className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
            Work email <span className="text-[#9f3a2f]">*</span>
          </label>
          <input
            type="email"
            value={fields.email}
            onChange={(e) => setField('email', e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
              Organisation
            </label>
            <input
              value={fields.organisation}
              onChange={(e) => setField('organisation', e.target.value)}
              className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
              Role / Job title
            </label>
            <input
              value={fields.role}
              onChange={(e) => setField('role', e.target.value)}
              className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
            />
          </div>
        </div>

        {demographicFields.length > 0 && (
          <div className="space-y-4 border-t border-[var(--site-border)] pt-5">
            <p className="text-sm font-medium text-[var(--site-text-primary)]">Additional information</p>
            {demographicFields.map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                  {field.label}
                </label>
                <input
                  value={fields.demographics[field.key] ?? ''}
                  onChange={(e) => setDemographic(field.key, e.target.value)}
                  className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
                />
              </div>
            ))}
          </div>
        )}

        {error ? <p className="text-sm text-[#9f3a2f]">{error}</p> : null}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-10 py-4 text-base font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)] disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Continue to survey'}
          </button>
        </div>
      </form>
    </section>
  )
}
