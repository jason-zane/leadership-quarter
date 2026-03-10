'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AssessmentRunner } from '@/components/assess/assessment-runner'
import {
  CampaignRegistrationStep,
  type CampaignRegistrationStepSubmission,
} from '@/components/site/campaign-registration-step'
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
  const [pendingResponses, setPendingResponses] = useState<Record<string, number> | null>(null)
  const [completedNoReport, setCompletedNoReport] = useState(false)
  const [reportReadyPath, setReportReadyPath] = useState<string | null>(null)

  async function finalizeSubmission(intake: CampaignRegistrationStepSubmission) {
    if (!pendingResponses) {
      throw new Error('Assessment responses are missing. Please restart the assessment.')
    }

    const body =
      campaign.config.registration_position === 'after'
        ? {
            responses: pendingResponses,
            participant: {
              firstName: intake.firstName,
              lastName: intake.lastName,
              email: intake.email,
              organisation: intake.organisation,
              role: intake.role,
            },
            demographics: intake.demographics,
          }
        : {
            responses: pendingResponses,
            demographics: intake.demographics,
          }

    const res = await fetch(`/api/assessments/campaigns/${encodeURIComponent(campaign.slug)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const responseBody = (await res.json().catch(() => null)) as
      | {
          ok?: boolean
          error?: string
          message?: string
          reportPath?: string
          reportAccessToken?: string
          nextStep?: 'contact_gate' | 'complete_no_report'
          gatePath?: string
        }
      | null

    if (!res.ok || !responseBody?.ok) {
      throw new Error(responseBody?.message ?? responseBody?.error ?? 'Could not submit assessment.')
    }

    if (responseBody.reportPath && responseBody.reportAccessToken && !runnerConfig.data_collection_only) {
      setReportReadyPath(`${responseBody.reportPath}?access=${encodeURIComponent(responseBody.reportAccessToken)}`)
      return
    }

    if (responseBody.nextStep === 'contact_gate' && responseBody.gatePath && !runnerConfig.data_collection_only) {
      window.location.assign(responseBody.gatePath)
      return
    }

    if (responseBody.nextStep === 'complete_no_report' || runnerConfig.data_collection_only) {
      setCompletedNoReport(true)
      return
    }

    throw new Error('Assessment submitted but next step is unavailable.')
  }

  if (token) {
    if (typeof window !== 'undefined') {
      window.location.assign(`/assess/i/${token}`)
    }
    return <section className="assess-card"><p className="assess-subtitle">Redirecting…</p></section>
  }

  if (completedNoReport) {
    return (
      <section className="assess-card">
        <p className="assess-kicker">Assessment complete</p>
        <h2 className="assess-title">{runnerConfig.completion_screen_title}</h2>
        <p className="assess-subtitle">{runnerConfig.completion_screen_body}</p>
        <div className="assess-actions">
          <Link href={runnerConfig.completion_screen_cta_href} className="assess-primary-btn inline-flex items-center justify-center">
            {runnerConfig.completion_screen_cta_label}
          </Link>
        </div>
      </section>
    )
  }

  if (reportReadyPath) {
    return (
      <section className="assess-card">
        <p className="assess-kicker">Assessment complete</p>
        <h2 className="assess-title">Your results are ready</h2>
        <p className="assess-subtitle">
          We&apos;ve finished processing your responses. Continue to view your full assessment report.
        </p>
        <div className="assess-actions">
          <Link href={reportReadyPath} className="assess-primary-btn inline-flex items-center justify-center">
            View report
          </Link>
        </div>
      </section>
    )
  }

  if (campaign.config.registration_position === 'before') {
    return (
      <div className="space-y-4">
        <section className="assess-card">
          <p className="assess-kicker">{runnerConfig.intro || campaign.organisation || 'Campaign'}</p>
          <h1 className="assess-title">{runnerConfig.title || assessment.name}</h1>
          <p className="assess-subtitle">{runnerConfig.subtitle || assessment.description || 'Register to begin this assessment.'}</p>
        </section>
        <CampaignRegistrationStep campaignSlug={campaign.slug} campaignConfig={campaign.config} onRegistered={setToken} />
      </div>
    )
  }

  const requiresPostAssessmentStep =
    campaign.config.registration_position === 'after' ||
    (
      campaign.config.registration_position === 'none' &&
      campaign.config.demographics_enabled &&
      campaign.config.demographics_fields.length > 0
    )

  if (pendingResponses && requiresPostAssessmentStep) {
    return (
      <CampaignRegistrationStep
        campaignConfig={campaign.config}
        variant={campaign.config.registration_position === 'after' ? 'after' : 'anonymous'}
        onSubmitParticipant={finalizeSubmission}
      />
    )
  }

  return (
    <AssessmentRunner
      assessment={assessment}
      questions={questions}
      runnerConfig={runnerConfig}
      submitEndpoint={`/api/assessments/campaigns/${encodeURIComponent(campaign.slug)}/submit`}
      onResponsesReady={requiresPostAssessmentStep ? setPendingResponses : undefined}
      headerContext={{
        label: 'Campaign',
        value: [campaign.name, campaign.organisation].filter(Boolean).join(' · '),
      }}
    />
  )
}
