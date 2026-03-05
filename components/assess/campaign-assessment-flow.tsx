'use client'

import { useState } from 'react'
import { CampaignRegistrationStep } from '@/components/site/campaign-registration-step'
import { AssessmentRunner } from '@/components/assess/assessment-runner'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import type { RunnerConfig } from '@/utils/assessments/experience-config'

type Question = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
}

type Props = {
  campaign: {
    slug: string
    name: string
    organisation: string | null
    config: CampaignConfig
  }
  assessment: {
    id: string
    key: string
    name: string
    description: string | null
    version?: number
  }
  questions: Question[]
  runnerConfig: RunnerConfig
}

export function CampaignAssessmentFlow({ campaign, assessment, questions, runnerConfig }: Props) {
  const [token, setToken] = useState<string | null>(null)

  if (token) {
    if (typeof window !== 'undefined') {
      window.location.assign(`/assess/i/${token}`)
    }
    return <section className="assess-card"><p className="assess-subtitle">Redirecting…</p></section>
  }

  if (campaign.config.registration_position === 'before') {
    return (
      <div className="space-y-4">
        <section className="assess-card">
          <p className="assess-kicker">{campaign.organisation ?? 'Campaign'}</p>
          <h1 className="assess-title">{assessment.name}</h1>
          <p className="assess-subtitle">{assessment.description ?? 'Register to begin this assessment.'}</p>
        </section>
        <CampaignRegistrationStep campaignSlug={campaign.slug} campaignConfig={campaign.config} onRegistered={setToken} />
      </div>
    )
  }

  return (
    <AssessmentRunner
      assessment={assessment}
      questions={questions}
      runnerConfig={runnerConfig}
      submitEndpoint={`/api/assessments/campaigns/${encodeURIComponent(campaign.slug)}/submit`}
    />
  )
}
