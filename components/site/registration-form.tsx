'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackSiteEvent } from '@/utils/analytics'
import { siteButtonClasses } from '@/utils/brand/site-brand'

type RegistrationMode = 'general' | 'retreat'

type Props = {
  mode: RegistrationMode
  source?: string
  retreatSlug?: string
  retreatName?: string
  submitCtaLabel?: string
}

type ApiSuccess = {
  ok: boolean
  submissionId?: string
  next?: string
}

const AGE_RANGE_OPTIONS = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55-64',
  '65+',
]

const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Self-describe']

const RUNNER_TYPE_OPTIONS = [
  'New or returning runner',
  'Consistent recreational runner',
  'Social/community runner',
  'Endurance-focused runner',
]

const BUDGET_OPTIONS = [
  { value: '2k_or_less', label: '2k or less' },
  { value: '2k_4k', label: '2k-4k' },
  { value: '4k_6k', label: '4k-6k' },
  { value: '6k_8k', label: '6k-8k' },
  { value: '8k_or_more', label: '8k or more' },
]

const SOURCE_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'friend', label: 'A friend or colleague' },
  { value: 'running-club', label: 'Running club' },
  { value: 'google', label: 'Google search' },
  { value: 'podcast', label: 'Podcast or newsletter' },
  { value: 'other', label: 'Other' },
]

const PROFILE_SELECTS: Array<{
  id: string
  label: string
  options: string[]
}> = [
  {
    id: 'retreatStylePreference',
    label: 'What retreat style sounds most like you?',
    options: ['More running adventure', 'Balanced run + recovery', 'More wellness and downtime'],
  },
  {
    id: 'durationPreference',
    label: 'Ideal retreat length',
    options: ['2-3 days', '4-5 days', '6+ days', 'Not sure yet'],
  },
  {
    id: 'travelRadius',
    label: 'How far would you travel for a retreat?',
    options: ['Within 2 hours', 'Within my state/region', 'Anywhere in the country', 'International'],
  },
  {
    id: 'accommodationPreference',
    label: 'Accommodation preference',
    options: ['Boutique luxury', 'Nature-first eco stay', 'Simple and comfortable', 'No preference'],
  },
  {
    id: 'communityVsPerformance',
    label: 'What matters most?',
    options: ['Community and connection', 'A mix of both', 'Performance and training focus'],
  },
  {
    id: 'preferredSeason',
    label: 'Preferred season',
    options: ['Summer', 'Autumn/Fall', 'Winter', 'Spring', 'Flexible'],
  },
  {
    id: 'genderOptional',
    label: 'Gender (optional)',
    options: ['Woman', 'Man', 'Non-binary', 'Prefer to self-describe', 'Prefer not to say'],
  },
  {
    id: 'lifeStageOptional',
    label: 'Life stage (optional)',
    options: [
      'Student',
      'Early career',
      'Mid career',
      'Parent/caregiver',
      'Retired',
      'Prefer not to say',
    ],
  },
]

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function ChoiceGroup({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string
  label: string
  value: string
  options: string[]
  onChange: (next: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 block font-ui text-sm font-medium text-[var(--site-text-body)]">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                selected
                  ? 'border-[var(--site-cta-bg)] bg-[var(--site-cta-bg)] text-[var(--site-cta-text)]'
                  : 'border-[var(--site-border)] bg-[var(--site-surface-elevated)] text-[var(--site-text-body)] hover:border-[var(--site-accent)]'
              }`}
              aria-pressed={selected}
            >
              {option}
            </button>
          )
        })}
      </div>
      <input type="hidden" name={name} value={value} readOnly />
    </fieldset>
  )
}

export function RegistrationForm({
  mode,
  source,
  retreatSlug,
  retreatName,
  submitCtaLabel,
}: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [emailValue, setEmailValue] = useState('')

  const [ageRange, setAgeRange] = useState('')
  const [gender, setGender] = useState('')
  const [runnerType, setRunnerType] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [locationLabel, setLocationLabel] = useState('')

  const searchParams = useSearchParams()

  const [showProfile, setShowProfile] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [profileSubmitted, setProfileSubmitted] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [didTrackStart, setDidTrackStart] = useState(false)

  const formKey = useMemo(
    () => (mode === 'retreat' ? 'retreat_registration_v1' : 'general_registration_v1'),
    [mode]
  )

  useEffect(() => {
    const prefill = searchParams?.get('location')
    if (!prefill) return
    setLocationLabel(prefill)
  }, [searchParams])

  const defaultSource = source ?? (mode === 'retreat' && retreatSlug ? `retreat:${retreatSlug}` : 'site:general')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)

    const form = e.currentTarget
    const payload = new FormData(form)
    const genderSelfDescribe = String(payload.get('genderSelfDescribe') ?? '').trim()

    if (!ageRange || !gender || !runnerType) {
      setSubmitError('Please complete age range, gender, and runner type.')
      return
    }

    if (gender === 'Self-describe' && !genderSelfDescribe) {
      setSubmitError('Please add your gender description.')
      return
    }

    if (mode === 'retreat' && !acceptedTerms) {
      setSubmitError('Please accept the terms and conditions to apply.')
      return
    }

    setIsSubmitting(true)

    payload.set('formKey', formKey)
    payload.set('source', payload.get('source')?.toString().trim() || defaultSource)

    if (mode === 'retreat' && retreatSlug) {
      payload.set('retreatSlug', retreatSlug)
      payload.set('retreatName', retreatName ?? retreatSlug)
    }

    trackSiteEvent('form_submitted_attempt', {
      form_key: formKey,
      page_type: mode,
      retreat_slug: retreatSlug ?? null,
    })

    try {
      const response = await fetch('/api/register-interest', {
        method: 'POST',
        body: payload,
      })

      const body = (await response.json().catch(() => null)) as ApiSuccess | { error?: string } | null
      if (!response.ok) {
        throw new Error((body as { error?: string } | null)?.error ?? 'Unable to submit right now.')
      }

      setEmailValue(String(payload.get('email') ?? '').trim().toLowerCase())
      setSubmitted(true)
      setShowProfile(false)
      setProfileSubmitted(false)
      setProfileError(null)
      setDidTrackStart(false)
      form.reset()
      setAgeRange('')
      setGender('')
      setRunnerType('')
      setAcceptedTerms(false)

      trackSiteEvent('form_submitted', {
        form_key: formKey,
        page_type: mode,
        retreat_slug: retreatSlug ?? null,
        next: (body as ApiSuccess | null)?.next ?? null,
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
      trackSiteEvent('form_submit_failed', {
        form_key: formKey,
        page_type: mode,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileError(null)
    setProfileSubmitting(true)

    const form = e.currentTarget
    const payload = new FormData(form)
    payload.set('email', emailValue)
    payload.set('source', defaultSource)
    payload.set('formKey', 'retreat_profile_optional_v1')

    if (mode === 'retreat' && retreatSlug) {
      payload.set('retreatSlug', retreatSlug)
      payload.set('retreatName', retreatName ?? retreatSlug)
    }

    try {
      const response = await fetch('/api/register-profile', {
        method: 'POST',
        body: payload,
      })

      const body = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        throw new Error(body?.error ?? 'Unable to submit profile right now.')
      }

      setProfileSubmitted(true)
      setShowProfile(false)
      form.reset()
      trackSiteEvent('optional_profile_submitted', {
        form_key: formKey,
        page_type: mode,
      })
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setProfileSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center">
          <p className="mb-2 font-serif text-3xl font-bold text-[var(--site-text-primary)]">Thank you.</p>
          <p className="text-base text-[var(--site-text-body)]">
            You&apos;re on the list. A confirmation email is on the way.
          </p>
        </div>

        {profileSubmitted ? (
          <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Thanks for sharing your preferences. This helps us design better retreats for you.
          </p>
        ) : (
          <div className="rounded border border-[var(--site-border-soft)] bg-[var(--site-surface-soft)] p-4">
            <p className="mb-3 text-sm text-[var(--site-text-body)]">
              Help us tailor future retreats to you. Optional, takes around 60 seconds.
            </p>

            {showProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {PROFILE_SELECTS.map((field) => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="mb-1 block font-ui text-sm font-medium text-[var(--site-text-body)]">
                      {field.label}
                    </label>
                    <select
                      id={field.id}
                      name={field.id}
                      className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-3 py-2 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
                      defaultValue=""
                    >
                      <option value="">Select an option</option>
                      {field.options.map((option) => (
                        <option key={option} value={toSlug(option)}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                <div>
                  <label htmlFor="budgetRange" className="mb-1 block font-ui text-sm font-medium text-[var(--site-text-body)]">
                    What budget range feels realistic for a retreat?
                  </label>
                  <select
                    id="budgetRange"
                    name="budgetRange"
                    className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-3 py-2 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
                    defaultValue=""
                  >
                    <option value="">Select an option</option>
                    {BUDGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="whatWouldMakeItGreat" className="mb-1 block font-ui text-sm font-medium text-[var(--site-text-body)]">
                    What would make this an exceptional retreat for you?
                  </label>
                  <textarea
                    id="whatWouldMakeItGreat"
                    name="whatWouldMakeItGreat"
                    rows={3}
                    className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-3 py-2 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
                    placeholder="Optional"
                  />
                </div>

                {profileError ? <p className="text-sm text-red-700">{profileError}</p> : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={profileSubmitting}
                    className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-60 ${siteButtonClasses.primary}`}
                  >
                    {profileSubmitting ? 'Submitting...' : 'Submit Optional Profile'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(false)
                      trackSiteEvent('optional_profile_skipped', {
                        form_key: formKey,
                        page_type: mode,
                        place: 'inline_form',
                      })
                    }}
                    className={`rounded px-4 py-2 text-sm font-medium ${siteButtonClasses.outlineLight}`}
                  >
                    Skip for now
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(true)
                    trackSiteEvent('optional_profile_opened', {
                      form_key: formKey,
                      page_type: mode,
                    })
                  }}
                  className={`rounded px-4 py-2 text-sm font-medium ${siteButtonClasses.primary}`}
                >
                  Help shape future retreats
                </button>
                <button
                  type="button"
                  onClick={() => {
                    trackSiteEvent('optional_profile_skipped', {
                      form_key: formKey,
                      page_type: mode,
                      place: 'success_state',
                    })
                  }}
                  className={`rounded px-4 py-2 text-sm font-medium ${siteButtonClasses.outlineLight}`}
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={() => {
        if (didTrackStart) return
        setDidTrackStart(true)
        trackSiteEvent('form_started', {
          form_key: formKey,
          page_type: mode,
          retreat_slug: retreatSlug ?? null,
        })
      }}
      className="space-y-5"
    >
      <input type="hidden" name="formKey" value={formKey} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formKey}-firstName`} className="mb-2 block font-ui text-sm font-medium text-[var(--site-text-body)]">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id={`${formKey}-firstName`}
            name="firstName"
            type="text"
            required
            className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor={`${formKey}-lastName`} className="mb-2 block font-ui text-sm font-medium text-[var(--site-text-body)]">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id={`${formKey}-lastName`}
            name="lastName"
            type="text"
            required
            className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${formKey}-email`} className="mb-2 block font-ui text-sm font-medium text-[var(--site-text-body)]">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id={`${formKey}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          onChange={(e) => setEmailValue(e.target.value.trim().toLowerCase())}
          className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
        />
      </div>

      <ChoiceGroup
        name="ageRange"
        label="Age range"
        value={ageRange}
        options={AGE_RANGE_OPTIONS}
        onChange={setAgeRange}
      />

      <ChoiceGroup
        name="gender"
        label="Gender"
        value={gender}
        options={GENDER_OPTIONS}
        onChange={setGender}
      />

      {gender === 'Self-describe' ? (
        <div>
          <label
            htmlFor={`${formKey}-gender-self-describe`}
            className="mb-2 block font-ui text-sm font-medium text-[var(--site-text-body)]"
          >
            Please describe your gender <span className="text-red-500">*</span>
          </label>
          <input
            id={`${formKey}-gender-self-describe`}
            name="genderSelfDescribe"
            type="text"
            required
            className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
          />
        </div>
      ) : null}

      <ChoiceGroup
        name="runnerType"
        label="Which best describes your running style?"
        value={runnerType}
        options={RUNNER_TYPE_OPTIONS}
        onChange={setRunnerType}
      />

      <div>
        <label htmlFor={`${formKey}-location`} className="mb-2 block font-ui text-sm font-medium text-[var(--site-text-body)]">
          Your location <span className="text-red-500">*</span>
        </label>
        <input
          id={`${formKey}-location`}
          name="locationLabel"
          type="text"
          required
          placeholder="City / region"
          value={locationLabel}
          onChange={(e) => setLocationLabel(e.target.value)}
          className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor={`${formKey}-source`} className="mb-2 block font-ui text-sm font-medium text-[var(--site-text-body)]">
          How did you hear about us?
        </label>
        <select
          id={`${formKey}-source`}
          name="source"
          className="w-full font-ui border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3 text-sm text-[var(--site-text-primary)] focus:border-[var(--site-accent-strong)] focus:outline-none"
          defaultValue={defaultSource.startsWith('retreat:') || defaultSource.startsWith('site:') ? '' : defaultSource}
        >
          <option value="">Select an option</option>
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 rounded border border-[var(--site-border-soft)] bg-[var(--site-surface-soft)] p-4">
        <label className="flex items-start gap-3 text-sm text-[var(--site-text-body)]">
          <input
            type="checkbox"
            name="marketingOptIn"
            value="1"
            className="mt-1 h-4 w-4 border-[var(--site-border)]"
          />
          <span>
            I&apos;d like to receive occasional Miles Between updates and retreat announcements.
          </span>
        </label>

        {mode === 'retreat' ? (
          <label className="flex items-start gap-3 text-sm text-[var(--site-text-body)]">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 border-[var(--site-border)]"
              required
            />
            <span>
              I agree to the{' '}
              <Link href="/terms-and-conditions" target="_blank" className="underline hover:no-underline">
                Terms and Conditions
              </Link>
              .
            </span>
          </label>
        ) : null}
      </div>

      {mode === 'retreat' && retreatSlug ? <input type="hidden" name="retreatSlug" value={retreatSlug} /> : null}
      {mode === 'retreat' && retreatName ? <input type="hidden" name="retreatName" value={retreatName} /> : null}

      {submitError ? <p className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-4 text-sm font-medium transition-colors disabled:opacity-60 ${siteButtonClasses.primary}`}
      >
        {isSubmitting ? 'Submitting...' : (submitCtaLabel ?? 'Register Interest in 60 Seconds')}
      </button>

      <p className="text-center text-xs text-[var(--site-text-muted)]">
        We&apos;ll only send relevant retreat updates and planning invites.
      </p>
    </form>
  )
}
