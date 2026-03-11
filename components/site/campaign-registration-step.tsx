'use client'

import { useMemo, useState } from 'react'
import type {
  CampaignConfig,
  CampaignDemographics,
  CampaignDemographicValue,
} from '@/utils/assessments/campaign-types'
import { getEnabledDemographicFields } from '@/utils/assessments/campaign-types'

type ParticipantFields = {
  firstName: string
  lastName: string
  email: string
  organisation: string
  role: string
  demographics: CampaignDemographics
}

export type CampaignRegistrationStepSubmission = {
  firstName: string
  lastName: string
  email: string
  organisation: string
  role: string
  demographics: CampaignDemographics
}

type Props = {
  campaignConfig: CampaignConfig
  title: string
  description: string
  submitLabel: string
  showIdentityFields?: boolean
  showDemographicFields?: boolean
  onSubmitParticipant: (payload: CampaignRegistrationStepSubmission) => Promise<void>
}

function isMultiSelectValue(value: CampaignDemographicValue | undefined): value is string[] {
  return Array.isArray(value)
}

export function CampaignRegistrationStep({
  campaignConfig,
  title,
  description,
  submitLabel,
  showIdentityFields = true,
  showDemographicFields = true,
  onSubmitParticipant,
}: Props) {
  const [fields, setFields] = useState<ParticipantFields>({
    firstName: '',
    lastName: '',
    email: '',
    organisation: '',
    role: '',
    demographics: {},
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const demographicFields = useMemo(
    () => (
      campaignConfig.demographics_enabled && showDemographicFields
        ? getEnabledDemographicFields(campaignConfig.demographics_fields)
        : []
    ),
    [campaignConfig.demographics_enabled, campaignConfig.demographics_fields, showDemographicFields]
  )

  function setField(key: keyof Omit<ParticipantFields, 'demographics'>, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function setDemographic(key: string, value: string) {
    setFields((prev) => ({
      ...prev,
      demographics: {
        ...prev.demographics,
        [key]: value,
      },
    }))
  }

  function toggleDemographicOption(key: string, value: string) {
    setFields((prev) => {
      const current = prev.demographics[key]
      const values = isMultiSelectValue(current) ? current : []
      const hasValue = values.includes(value)

      let nextValues = hasValue ? values.filter((item) => item !== value) : [...values, value]

      if (value === 'prefer_not_to_say') {
        nextValues = hasValue ? [] : ['prefer_not_to_say']
      } else if (!hasValue) {
        nextValues = nextValues.filter((item) => item !== 'prefer_not_to_say')
      }

      const nextDemographics: CampaignDemographics = {
        ...prev.demographics,
        [key]: nextValues,
      }

      if (nextValues.length === 0) {
        delete nextDemographics[key]
      }

      if (!nextValues.includes('self_describe')) {
        delete nextDemographics[`${key}_self_describe`]
      }

      return {
        ...prev,
        demographics: nextDemographics,
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await onSubmitParticipant({
        firstName: fields.firstName,
        lastName: fields.lastName,
        email: fields.email,
        organisation: fields.organisation,
        role: fields.role,
        demographics: campaignConfig.demographics_enabled ? fields.demographics : {},
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="site-card-strong p-6 md:p-8">
      <h2 className="font-serif text-[clamp(1.8rem,4vw,3rem)] leading-[1.06] text-[var(--site-text-primary)]">
        {title}
      </h2>
      <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
        {description}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {showIdentityFields ? (
          <>
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
          </>
        ) : null}

        {demographicFields.length > 0 ? (
          <div className="space-y-5 border-t border-[var(--site-border)] pt-5">
            <p className="text-sm font-medium text-[var(--site-text-primary)]">Additional information</p>
            {demographicFields.map((field) => {
              const rawValue = fields.demographics[field.key]
              const currentValue = typeof rawValue === 'string' ? rawValue : ''
              const currentValues = isMultiSelectValue(rawValue) ? rawValue : []
              const showCompanion = field.companionKey
                ? field.inputType === 'multiselect'
                  ? currentValues.includes('self_describe')
                  : currentValue === 'self_describe'
                : false

              return (
                <div key={field.key}>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                    {field.label}
                  </label>

                  {field.inputType === 'text' ? (
                    <input
                      value={currentValue}
                      onChange={(e) => setDemographic(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
                    />
                  ) : null}

                  {field.inputType === 'select' ? (
                    <select
                      value={currentValue}
                      onChange={(e) => {
                        setDemographic(field.key, e.target.value)
                        if (field.companionKey && e.target.value !== 'self_describe') {
                          setDemographic(field.companionKey, '')
                        }
                      }}
                      className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
                    >
                      <option value="">Select an option</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {field.inputType === 'multiselect' ? (
                    <div className="space-y-2">
                      {field.options?.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)]"
                        >
                          <input
                            type="checkbox"
                            checked={currentValues.includes(option.value)}
                            onChange={() => toggleDemographicOption(field.key, option.value)}
                            className="h-4 w-4 rounded border-[var(--site-border)]"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {showCompanion && field.companionKey ? (
                    <div className="mt-3">
                      <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                        {field.companionLabel ?? 'Tell us more'}
                      </label>
                      <input
                        value={typeof fields.demographics[field.companionKey] === 'string'
                          ? String(fields.demographics[field.companionKey] ?? '')
                          : ''}
                        onChange={(e) => setDemographic(field.companionKey!, e.target.value)}
                        className="w-full rounded-xl border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--site-primary)]"
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}

        {error ? <p className="text-sm text-[#9f3a2f]">{error}</p> : null}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-10 py-4 text-base font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)] disabled:opacity-50"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}
