'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AssessmentRunner } from '@/components/assess/assessment-runner'
import { AssessmentV2OpeningPanel } from '@/components/assess/v2-experience-panels'
import {
  CampaignRegistrationStep,
  type CampaignRegistrationStepSubmission,
} from '@/components/site/campaign-registration-step'
import { getPublicCampaignApiPath } from '@/utils/campaign-url'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import type { RunnerConfig } from '@/utils/assessments/experience-config'
import type { AssessmentV2ExperienceConfig } from '@/utils/assessments/v2-experience-config'
import type { RuntimeAssessmentScale } from '@/utils/services/assessment-runtime-content'

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
    organisationSlug: string
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
  runtimeMode?: 'default' | 'v2'
  v2ExperienceConfig?: AssessmentV2ExperienceConfig
  scale?: RuntimeAssessmentScale
  submitEndpoint?: string
}

type CampaignParticipantDetails = Pick<
  CampaignRegistrationStepSubmission,
  'firstName' | 'lastName' | 'email' | 'organisation' | 'role'
>

function campaignErrorMessage(error: string | undefined, fallback: string) {
  if (error === 'campaign_limit_reached') return 'This campaign has reached its assessment limit.'
  if (error === 'campaign_not_active') return 'This campaign is no longer accepting responses.'
  if (error === 'assessment_not_active' || error === 'survey_not_active') {
    return 'The assessment for this campaign is currently unavailable.'
  }
  return fallback
}

function toParticipantDetails(
  intake: CampaignRegistrationStepSubmission
): CampaignParticipantDetails {
  return {
    firstName: intake.firstName,
    lastName: intake.lastName,
    email: intake.email,
    organisation: intake.organisation,
    role: intake.role,
  }
}

function renderCampaignIntroPanel(input: {
  runtimeMode: 'default' | 'v2'
  runnerConfig: RunnerConfig
  experienceConfig?: AssessmentV2ExperienceConfig
  assessmentName: string
  assessmentDescription: string | null
  campaignName: string
  organisationName: string | null
  subtitle: string
}) {
  if (input.runtimeMode === 'v2' && input.experienceConfig) {
    return (
      <AssessmentV2OpeningPanel
        runnerConfig={input.runnerConfig}
        experienceConfig={input.experienceConfig}
        title={input.runnerConfig.title || input.assessmentName}
        subtitle={input.subtitle}
        intro={input.runnerConfig.intro || input.organisationName || 'Campaign'}
        contextLabel={[input.campaignName, input.organisationName].filter(Boolean).join(' · ')}
      />
    )
  }

  return (
    <section className="assess-card">
      <p className="assess-kicker">{input.runnerConfig.intro || input.organisationName || 'Campaign'}</p>
      <h1 className="assess-title">{input.runnerConfig.title || input.assessmentName}</h1>
      <p className="assess-subtitle">{input.subtitle || input.assessmentDescription || 'Register to begin this assessment.'}</p>
    </section>
  )
}

export function CampaignAssessmentFlow({
  campaign,
  assessment,
  questions,
  runnerConfig,
  runtimeMode = 'default',
  v2ExperienceConfig,
  scale,
  submitEndpoint,
}: Props) {
  const [redirectPath, setRedirectPath] = useState<string | null>(null)
  const [pendingResponses, setPendingResponses] = useState<Record<string, number> | null>(null)
  const [completedNoReport, setCompletedNoReport] = useState(false)
  const [reportReadyPath, setReportReadyPath] = useState<string | null>(null)
  const [beforeParticipant, setBeforeParticipant] = useState<CampaignParticipantDetails | null>(null)
  const [beforeDemographics, setBeforeDemographics] = useState<CampaignRegistrationStepSubmission['demographics'] | null>(null)
  const [afterParticipant, setAfterParticipant] = useState<CampaignParticipantDetails | null>(null)
  const [afterDemographics, setAfterDemographics] = useState<CampaignRegistrationStepSubmission['demographics'] | null>(null)

  const hasDemographicFields =
    campaign.config.demographics_enabled &&
    campaign.config.demographics_fields.length > 0
  const hasBeforeRegistration = campaign.config.registration_position === 'before'
  const hasAfterRegistration =
    campaign.config.registration_position === 'after' &&
    campaign.config.report_access !== 'gated'
  const hasBeforeDemographics =
    hasDemographicFields && campaign.config.demographics_position === 'before'
  const hasAfterDemographics =
    hasDemographicFields && campaign.config.demographics_position === 'after'

  async function registerBeforeAssessment(
    participant: CampaignParticipantDetails,
    demographics: CampaignRegistrationStepSubmission['demographics'] | null
  ) {
    const registerEndpoint = `${getPublicCampaignApiPath(campaign.slug, campaign.organisationSlug)}/register`
    const res = await fetch(registerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: participant.firstName,
        lastName: participant.lastName,
        email: participant.email,
        organisation: participant.organisation,
        role: participant.role,
        demographics: demographics ?? {},
      }),
    })

    const body = (await res.json().catch(() => null)) as
      | { ok?: boolean; error?: string; message?: string; token?: string; surveyPath?: string }
      | null

    if (!res.ok || !body?.ok || !body.token) {
      throw new Error(body?.message ?? campaignErrorMessage(body?.error, 'Registration failed. Please try again.'))
    }

    setRedirectPath(body.surveyPath ?? `/assess/i/${body.token}`)
  }

  async function submitCampaignResponses(input: {
    responses: Record<string, number>
    participant?: CampaignParticipantDetails | null
    demographics?: CampaignRegistrationStepSubmission['demographics'] | null
  }) {
    const body = input.participant
      ? {
          responses: input.responses,
          participant: {
            firstName: input.participant.firstName,
            lastName: input.participant.lastName,
            email: input.participant.email,
            organisation: input.participant.organisation,
            role: input.participant.role,
          },
          demographics: input.demographics ?? {},
        }
      : {
          responses: input.responses,
          demographics: input.demographics ?? {},
        }

    const res = await fetch(
      submitEndpoint ?? `${getPublicCampaignApiPath(campaign.slug, campaign.organisationSlug)}/submit`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

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
      throw new Error(responseBody?.message ?? campaignErrorMessage(responseBody?.error, 'Could not submit assessment.'))
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

  async function submitAfterRegistrationStep(intake: CampaignRegistrationStepSubmission) {
    const participant = toParticipantDetails(intake)
    setAfterParticipant(participant)

    if (hasAfterDemographics) {
      return
    }

    if (!pendingResponses) {
      throw new Error('Assessment responses are missing. Please restart the assessment.')
    }

    await submitCampaignResponses({
      responses: pendingResponses,
      participant,
      demographics: beforeDemographics,
    })
  }

  async function submitAfterDemographicsStep(intake: CampaignRegistrationStepSubmission) {
    const demographics = intake.demographics
    setAfterDemographics(demographics)

    if (!pendingResponses) {
      throw new Error('Assessment responses are missing. Please restart the assessment.')
    }

    await submitCampaignResponses({
      responses: pendingResponses,
      participant: afterParticipant,
      demographics: demographics,
    })
  }

  async function handleResponsesReady(responses: Record<string, number>) {
    if (hasAfterRegistration || hasAfterDemographics) {
      setPendingResponses(responses)
      return
    }

    await submitCampaignResponses({
      responses,
      demographics: beforeDemographics,
    })
  }

  if (redirectPath) {
    if (typeof window !== 'undefined') {
      window.location.assign(redirectPath)
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

  if (hasBeforeRegistration && !beforeParticipant) {
    return (
      <div className="space-y-4">
        {renderCampaignIntroPanel({
          runtimeMode,
          runnerConfig,
          experienceConfig: v2ExperienceConfig,
          assessmentName: assessment.name,
          assessmentDescription: assessment.description,
          campaignName: campaign.name,
          organisationName: campaign.organisation,
          subtitle: runnerConfig.subtitle || assessment.description || 'Register to begin this assessment.',
        })}
        <CampaignRegistrationStep
          campaignConfig={campaign.config}
          title="Register to begin"
          description="Enter your details to begin the assessment."
          submitLabel={hasBeforeDemographics ? 'Continue' : 'Continue to assessment'}
          showIdentityFields
          showDemographicFields={false}
          onSubmitParticipant={async (intake) => {
            const participant = toParticipantDetails(intake)
            setBeforeParticipant(participant)
            if (!hasBeforeDemographics) {
              await registerBeforeAssessment(participant, null)
            }
          }}
        />
      </div>
    )
  }

  if (hasBeforeDemographics && beforeDemographics === null) {
    return (
      <div className="space-y-4">
        {renderCampaignIntroPanel({
          runtimeMode,
          runnerConfig,
          experienceConfig: v2ExperienceConfig,
          assessmentName: assessment.name,
          assessmentDescription: assessment.description,
          campaignName: campaign.name,
          organisationName: campaign.organisation,
          subtitle: 'Add optional context before starting the assessment.',
        })}
        <CampaignRegistrationStep
          campaignConfig={campaign.config}
          title="Add optional context"
          description="Share demographic information separately from your registration details."
          submitLabel={hasBeforeRegistration ? 'Continue to assessment' : 'Start assessment'}
          showIdentityFields={false}
          showDemographicFields
          onSubmitParticipant={async (intake) => {
            setBeforeDemographics(intake.demographics)
            if (hasBeforeRegistration && beforeParticipant) {
              await registerBeforeAssessment(beforeParticipant, intake.demographics)
            }
          }}
        />
      </div>
    )
  }

  if (pendingResponses && hasAfterRegistration && !afterParticipant) {
    return (
      <CampaignRegistrationStep
        campaignConfig={campaign.config}
        title="One final step"
        description="Enter your contact details before we finalise your assessment."
        submitLabel={hasAfterDemographics ? 'Continue' : 'Finish assessment'}
        showIdentityFields
        showDemographicFields={false}
        onSubmitParticipant={submitAfterRegistrationStep}
      />
    )
  }

  if (pendingResponses && hasAfterDemographics && afterDemographics === null) {
    return (
      <CampaignRegistrationStep
        campaignConfig={campaign.config}
        title="Add optional context"
        description="Share demographic information separately from your registration details."
        submitLabel="Finish assessment"
        showIdentityFields={false}
        showDemographicFields
        onSubmitParticipant={submitAfterDemographicsStep}
      />
    )
  }

  return (
    <AssessmentRunner
      assessment={assessment}
      questions={questions}
      runnerConfig={runnerConfig}
      runtimeMode={runtimeMode}
      v2ExperienceConfig={v2ExperienceConfig}
      scale={scale}
      submitEndpoint={submitEndpoint ?? `${getPublicCampaignApiPath(campaign.slug, campaign.organisationSlug)}/submit`}
      onResponsesReady={
        hasBeforeDemographics || hasAfterRegistration || hasAfterDemographics
          ? handleResponsesReady
          : undefined
      }
      headerContext={{
        label: 'Campaign',
        value: [campaign.name, campaign.organisation].filter(Boolean).join(' · '),
      }}
    />
  )
}
