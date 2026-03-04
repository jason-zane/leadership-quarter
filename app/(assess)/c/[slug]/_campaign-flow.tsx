'use client'

import { useState } from 'react'
import { CampaignRegistrationStep } from '@/components/site/campaign-registration-step'
import { AiReadinessSurveyForm } from '@/components/site/ai-readiness-survey-form'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'

type Props = {
  campaignSlug: string
  campaignConfig: CampaignConfig
  assessmentName: string
  assessmentDescription: string | null
  organisationName: string | null
}

function BeforeRegistrationFlow({
  campaignSlug,
  campaignConfig,
  assessmentName,
  assessmentDescription,
  organisationName,
}: Props) {
  const [token, setToken] = useState<string | null>(null)

  if (token) {
    if (typeof window !== 'undefined') {
      window.location.assign(`/survey/${token}`)
    }
    return (
      <section className="site-card-strong p-6 md:p-8">
        <p className="text-sm text-[var(--site-text-body)]">Redirecting to assessment...</p>
      </section>
    )
  }

  return (
    <div className="space-y-8">
      <AssessmentHeader name={assessmentName} description={assessmentDescription} org={organisationName} />
      <CampaignRegistrationStep
        campaignSlug={campaignSlug}
        campaignConfig={campaignConfig}
        onRegistered={setToken}
      />
    </div>
  )
}

function DirectAssessmentFlow({
  assessmentName,
  assessmentDescription,
  organisationName,
}: Omit<Props, 'campaignSlug' | 'campaignConfig'>) {
  return (
    <div className="space-y-8">
      <AssessmentHeader name={assessmentName} description={assessmentDescription} org={organisationName} />
      <AiReadinessSurveyForm />
    </div>
  )
}

function AssessmentHeader({
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
    <DirectAssessmentFlow
      assessmentName={props.assessmentName}
      assessmentDescription={props.assessmentDescription}
      organisationName={props.organisationName}
    />
  )
}
