'use client'

import { useState } from 'react'
import { CampaignRegistrationStep } from '@/components/site/campaign-registration-step'
import { AiReadinessSurveyForm } from '@/components/site/ai-readiness-survey-form'
import type { CampaignConfig } from '@/utils/surveys/campaign-types'

type Props = {
  campaignSlug: string
  campaignConfig: CampaignConfig
  surveyName: string
  surveyDescription: string | null
  organisationName: string | null
}

// 'before' flow: registration step renders first.
// On register, API creates an invitation and returns a token.
// We then redirect to /survey/[token] — the existing invited flow handles the rest.
function BeforeRegistrationFlow({
  campaignSlug,
  campaignConfig,
  surveyName,
  surveyDescription,
  organisationName,
}: Props) {
  const [token, setToken] = useState<string | null>(null)

  if (token) {
    // Redirect to invited survey flow
    if (typeof window !== 'undefined') {
      window.location.assign(`/survey/${token}`)
    }
    return (
      <section className="site-card-strong p-6 md:p-8">
        <p className="text-sm text-[var(--site-text-body)]">Redirecting to survey...</p>
      </section>
    )
  }

  return (
    <div className="space-y-8">
      <SurveyHeader name={surveyName} description={surveyDescription} org={organisationName} />
      <CampaignRegistrationStep
        campaignSlug={campaignSlug}
        campaignConfig={campaignConfig}
        onRegistered={setToken}
      />
    </div>
  )
}

// 'after' / 'none' flow: render the public survey form directly.
// Submissions are stored in survey_submissions (from Phase 1 fix) and the user
// is redirected to the report at completion using the existing public path.
function DirectSurveyFlow({
  surveyName,
  surveyDescription,
  organisationName,
}: Omit<Props, 'campaignSlug' | 'campaignConfig'>) {
  return (
    <div className="space-y-8">
      <SurveyHeader name={surveyName} description={surveyDescription} org={organisationName} />
      <AiReadinessSurveyForm />
    </div>
  )
}

function SurveyHeader({
  name,
  description,
  org,
}: {
  name: string
  description: string | null
  org: string | null
}) {
  return (
    <section className="site-card-strong p-6 md:p-8">
      {org ? (
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{org}</p>
      ) : null}
      <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">{name}</h1>
      {description ? (
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{description}</p>
      ) : null}
    </section>
  )
}

export function CampaignFlow(props: Props) {
  const { campaignConfig } = props

  if (campaignConfig.registration_position === 'before') {
    return <BeforeRegistrationFlow {...props} />
  }

  return (
    <DirectSurveyFlow
      surveyName={props.surveyName}
      surveyDescription={props.surveyDescription}
      organisationName={props.organisationName}
    />
  )
}
