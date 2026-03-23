'use client'

import { useMemo, useState } from 'react'
import { CampaignContentBlocks } from '@/components/site/campaign-content-blocks'
import type {
  CampaignConfig,
  CampaignDemographics,
  CampaignDemographicValue,
  CampaignScreenContentBlock,
} from '@/utils/assessments/campaign-types'
import { getEnabledDemographicFields } from '@/utils/assessments/campaign-types'

type ParticipantFields = {
  firstName: string
  lastName: string
  email: string
  organisation: string
  role: string
  consent: boolean
  demographics: CampaignDemographics
}

export type CampaignRegistrationStepSubmission = {
  firstName: string
  lastName: string
  email: string
  organisation: string
  role: string
  consent: boolean
  demographics: CampaignDemographics
}

type Props = {
  campaignConfig: CampaignConfig
  eyebrow?: string
  title: string
  description: string
  submitLabel: string
  blocks?: CampaignScreenContentBlock[]
  showIdentityFields?: boolean
  showDemographicFields?: boolean
  identityHeading?: string
  identityDescription?: string
  demographicsHeading?: string
  demographicsDescription?: string
  requireAllIdentityFields?: boolean
  consentEnabled?: boolean
  consentLabel?: string
  consentDescription?: string
  onSubmitParticipant: (payload: CampaignRegistrationStepSubmission) => Promise<void>
}

function isMultiSelectValue(value: CampaignDemographicValue | undefined): value is string[] {
  return Array.isArray(value)
}

export function CampaignRegistrationStep({
  campaignConfig,
  eyebrow = '',
  title,
  description,
  submitLabel,
  blocks = [],
  showIdentityFields = true,
  showDemographicFields = true,
  identityHeading,
  identityDescription,
  demographicsHeading,
  demographicsDescription,
  requireAllIdentityFields = false,
  consentEnabled = false,
  consentLabel,
  consentDescription,
  onSubmitParticipant,
}: Props) {
  const [fields, setFields] = useState<ParticipantFields>({
    firstName: '',
    lastName: '',
    email: '',
    organisation: '',
    role: '',
    consent: false,
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

  function setField<Key extends keyof Omit<ParticipantFields, 'demographics'>>(key: Key, value: ParticipantFields[Key]) {
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
        consent: fields.consent,
        demographics: campaignConfig.demographics_enabled ? fields.demographics : {},
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="site-card-strong overflow-hidden p-6 md:p-8">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--site-text-muted)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 font-serif text-[clamp(1.8rem,4vw,3rem)] leading-[1.06] text-[var(--site-text-primary)]">
        {title}
      </h2>
      <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
        {description}
      </p>

      <CampaignContentBlocks blocks={blocks} />

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 border-t border-[rgba(120,144,170,0.12)] pt-6"
      >
        {showIdentityFields ? (
          <>
            {identityHeading || identityDescription ? (
              <div className="space-y-1">
                {identityHeading ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                    {identityHeading}
                  </p>
                ) : null}
                {identityDescription ? (
                  <p className="text-sm text-[var(--site-text-body)]">
                    {identityDescription}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                  First name <span className="text-[var(--site-required)]">*</span>
                </label>
                <input
                  value={fields.firstName}
                  onChange={(e) => setField('firstName', e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[var(--site-field-focus)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                  Last name <span className="text-[var(--site-required)]">*</span>
                </label>
                <input
                  value={fields.lastName}
                  onChange={(e) => setField('lastName', e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[var(--site-field-focus)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                Work email <span className="text-[var(--site-required)]">*</span>
              </label>
              <input
                type="email"
                value={fields.email}
                onChange={(e) => setField('email', e.target.value)}
                required
                className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[var(--site-field-focus)]"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                  Organisation{requireAllIdentityFields ? <span className="text-[var(--site-required)]"> *</span> : null}
                </label>
                <input
                  value={fields.organisation}
                  onChange={(e) => setField('organisation', e.target.value)}
                  required={requireAllIdentityFields}
                  className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[var(--site-field-focus)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                  Role / Job title{requireAllIdentityFields ? <span className="text-[var(--site-required)]"> *</span> : null}
                </label>
                <input
                  value={fields.role}
                  onChange={(e) => setField('role', e.target.value)}
                  required={requireAllIdentityFields}
                  className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[var(--site-field-focus)]"
                />
              </div>
            </div>
          </>
        ) : null}

        {demographicFields.length > 0 ? (
          <div className="space-y-5 pt-5">
            {demographicsHeading || demographicsDescription ? (
              <div className="space-y-1">
                {demographicsHeading ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                    {demographicsHeading}
                  </p>
                ) : null}
                {demographicsDescription ? (
                  <p className="text-sm text-[var(--site-text-body)]">
                    {demographicsDescription}
                  </p>
                ) : null}
              </div>
            ) : null}
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
                      className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[var(--site-field-focus)]"
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
                      className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--site-field-focus)]"
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
                          className="flex items-center gap-2 rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)]"
                        >
                          <input
                            type="checkbox"
                            checked={currentValues.includes(option.value)}
                            onChange={() => toggleDemographicOption(field.key, option.value)}
                            className="h-4 w-4 rounded border-[var(--site-field-border)]"
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
                        className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[var(--site-field-focus)]"
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}

        {consentEnabled ? (
          <div className="space-y-2 border-t border-[rgba(196,211,232,0.62)] pt-5">
            {consentDescription ? (
              <p className="text-sm text-[var(--site-text-body)]">{consentDescription}</p>
            ) : null}
            <label className="flex items-start gap-3 text-sm text-[var(--site-text-body)]">
              <input
                type="checkbox"
                checked={fields.consent}
                onChange={(e) => setField('consent', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--site-field-border)]"
                required
              />
              <span>{consentLabel || 'I agree to be contacted regarding assessment outcomes and related services.'}</span>
            </label>
          </div>
        ) : null}

        {error ? <p className="text-sm text-[var(--site-error)]">{error}</p> : null}

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-cta-bg)] px-10 py-4 text-base font-semibold tracking-[0.02em] text-[var(--site-cta-text)] shadow-[0_16px_40px_var(--site-cta-soft)] transition-colors hover:bg-[var(--site-cta-hover-bg)] disabled:opacity-50"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}
