'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AssessmentOpeningPanel, AssessmentPreviewAction } from '@/components/assess/assessment-experience-panels'
import { AssessmentRunner } from '@/components/assess/assessment-runner'
import {
  CampaignRegistrationStep,
  type CampaignRegistrationStepSubmission,
} from '@/components/site/campaign-registration-step'
import { CampaignScreenView } from '@/components/site/campaign-screen-view'
import type { CampaignJourneyResolved, CampaignJourneyResolvedPage } from '@/utils/assessments/campaign-journey'
import type { CampaignConfig, CampaignDemographics } from '@/utils/assessments/campaign-types'
import type { CampaignRuntimeAssessmentStep } from '@/utils/services/assessment-runtime-campaign'

type Props = {
  campaign: {
    slug: string
    organisationSlug: string
    name: string
    organisation: string | null
    config: CampaignConfig
  }
  resolvedJourney: CampaignJourneyResolved
  assessmentSteps: CampaignRuntimeAssessmentStep[]
  registerEndpoint: string
  submitEndpoint: string
}

type ParticipantDetails = Pick<
  CampaignRegistrationStepSubmission,
  'firstName' | 'lastName' | 'email' | 'organisation' | 'role' | 'consent'
>

type QueuedAssessmentSubmission = {
  assessmentId: string
  responses: Record<string, number>
}

type SubmissionOutcome =
  | { kind: 'complete_no_report' }
  | { kind: 'report'; path: string }

type RegistrationResponse = {
  ok?: boolean
  error?: string
  message?: string
  invitations?: Array<{
    assessmentId?: string
    token?: string
  }>
}

function toParticipantDetails(
  intake: CampaignRegistrationStepSubmission
): ParticipantDetails {
  return {
    firstName: intake.firstName,
    lastName: intake.lastName,
    email: intake.email,
    organisation: intake.organisation,
    role: intake.role,
    consent: intake.consent,
  }
}

function screenVariant(page: CampaignJourneyResolvedPage) {
  const style = page.flowStep?.screen_config.visual_style
  return style === 'transition' ? 'transition' : style === 'minimal' ? 'minimal' : 'standard'
}

function ScreenAction({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="assess-v2-primary-btn inline-flex items-center justify-center"
    >
      {label}
    </button>
  )
}

function CompletionAction({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <Link href={href} className="assess-v2-primary-btn inline-flex items-center justify-center">
      {label}
    </Link>
  )
}

export function CampaignAssessmentFlow({
  campaign,
  resolvedJourney,
  assessmentSteps,
  registerEndpoint,
  submitEndpoint,
}: Props) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [participant, setParticipant] = useState<ParticipantDetails | null>(null)
  const [demographics, setDemographics] = useState<CampaignDemographics | null>(null)
  const [invitationTokensByAssessmentId, setInvitationTokensByAssessmentId] = useState<Record<string, string>>({})
  const [queuedSubmissions, setQueuedSubmissions] = useState<QueuedAssessmentSubmission[]>([])
  const [queueError, setQueueError] = useState<string | null>(null)
  const [queueSubmitting, setQueueSubmitting] = useState(false)
  const [completionOutcome, setCompletionOutcome] = useState<SubmissionOutcome | null>(null)
  const [finalisingAttempt, setFinalisingAttempt] = useState(0)

  const pages = resolvedJourney.pages
  const currentPage = pages[currentPageIndex] ?? null
  const nextPage = pages[currentPageIndex + 1] ?? null
  const completionIndex = pages.findIndex((page) => page.type === 'completion')

  const assessmentStepMap = useMemo(
    () =>
      new Map(
        assessmentSteps.map((step) => [step.campaignAssessmentId, step] as const)
      ),
    [assessmentSteps]
  )

  const activeAssessmentStep =
    currentPage?.type === 'assessment' && currentPage.flowStep?.campaign_assessment_id
      ? assessmentStepMap.get(currentPage.flowStep.campaign_assessment_id) ?? null
      : null

  const useInvitationBackedSubmit =
    campaign.config.registration_position === 'before' && campaign.config.report_access === 'immediate'
  const combinedDemographicsPage =
    currentPage?.type === 'registration' && nextPage?.type === 'demographics'
      ? nextPage
      : null

  function moveToNextPage() {
    setCurrentPageIndex((current) => Math.min(current + 1, pages.length - 1))
  }

  function moveToPage(offset: number) {
    setCurrentPageIndex((current) => Math.min(current + offset, pages.length - 1))
  }

  async function registerParticipant(
    intake: CampaignRegistrationStepSubmission,
    registrationDemographics?: CampaignDemographics
  ) {
    const response = await fetch(registerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...toParticipantDetails(intake),
        demographics: registrationDemographics ?? demographics ?? undefined,
      }),
    })

    const body = (await response.json().catch(() => null)) as RegistrationResponse | null
    if (!response.ok || !body?.ok) {
      throw new Error(body?.message ?? body?.error ?? 'Could not register for this assessment.')
    }

    const nextTokens = Object.fromEntries(
      (body.invitations ?? [])
        .map((invitation) => {
          const assessmentId = typeof invitation.assessmentId === 'string' ? invitation.assessmentId : null
          const token = typeof invitation.token === 'string' ? invitation.token : null
          return assessmentId && token ? [assessmentId, token] : null
        })
        .filter((entry): entry is [string, string] => Array.isArray(entry))
    )

    setInvitationTokensByAssessmentId(nextTokens)
  }

  const flushQueuedAssessments = useCallback(async () => {
    if (queuedSubmissions.length === 0) {
      return { kind: 'complete_no_report' } as SubmissionOutcome
    }

    let finalOutcome: SubmissionOutcome = { kind: 'complete_no_report' }

    for (let index = 0; index < queuedSubmissions.length; index += 1) {
      const queued = queuedSubmissions[index]
      const isFinalAssessment = index === queuedSubmissions.length - 1
      const invitationToken = invitationTokensByAssessmentId[queued.assessmentId]
      const endpoint = useInvitationBackedSubmit && invitationToken
        ? `/api/assessments/invitation/${encodeURIComponent(invitationToken)}/submit`
        : submitEndpoint
      const payload = useInvitationBackedSubmit && invitationToken
        ? {
            responses: queued.responses,
            demographics: demographics ?? {},
            isFinalAssessment,
          }
        : {
            assessmentId: queued.assessmentId,
            responses: queued.responses,
            participant: participant ?? undefined,
            demographics: demographics ?? {},
            consent: participant?.consent,
            isFinalAssessment,
          }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => null)) as
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

      if (!response.ok || !body?.ok) {
        throw new Error(body?.message ?? body?.error ?? 'Could not submit this assessment.')
      }

      if (!isFinalAssessment) {
        continue
      }

      if (body.nextStep === 'contact_gate' && body.gatePath) {
        window.location.assign(body.gatePath)
        return null
      }

      if (body.reportPath && body.reportAccessToken) {
        finalOutcome = {
          kind: 'report',
          path: `${body.reportPath}?access=${encodeURIComponent(body.reportAccessToken)}`,
        }
      } else {
        finalOutcome = { kind: 'complete_no_report' }
      }
    }

    return finalOutcome
  }, [demographics, invitationTokensByAssessmentId, participant, queuedSubmissions, submitEndpoint, useInvitationBackedSubmit])

  useEffect(() => {
    if (!currentPage || currentPage.type !== 'finalising') {
      return
    }

    let active = true

    async function runFinalisingStep() {
      if (queuedSubmissions.length === 0) {
        if (completionIndex >= 0 && active) {
          setCurrentPageIndex(completionIndex)
        }
        return
      }

      setQueueSubmitting(true)
      setQueueError(null)

      try {
        const outcome = await flushQueuedAssessments()
        if (!active || outcome === null) return

        setCompletionOutcome(outcome)
        setQueuedSubmissions([])
        if (completionIndex >= 0) {
          setCurrentPageIndex(completionIndex)
        }
      } catch (error) {
        if (!active) return
        setQueueError(error instanceof Error ? error.message : 'Could not finish the campaign flow.')
      } finally {
        if (active) {
          setQueueSubmitting(false)
        }
      }
    }

    void runFinalisingStep()

    return () => {
      active = false
    }
  }, [completionIndex, currentPage?.id, currentPage?.type, finalisingAttempt, flushQueuedAssessments, queuedSubmissions.length])

  if (!currentPage) {
    return (
      <section className="site-card-strong p-6 md:p-8">
        <p className="text-sm text-[var(--site-text-body)]">This campaign has no pages configured.</p>
      </section>
    )
  }

  if (currentPage.type === 'intro') {
    return (
      <AssessmentOpeningPanel
        runnerConfig={resolvedJourney.runnerConfig}
        experienceConfig={{ ...resolvedJourney.experienceConfig, openingBlocks: currentPage.openingBlocks }}
        title={currentPage.title}
        subtitle={currentPage.description}
        intro={currentPage.eyebrow}
        ctaLabel={currentPage.ctaLabel ?? resolvedJourney.runnerConfig.start_cta_label}
        onCtaClick={moveToNextPage}
      />
    )
  }

  if (currentPage.type === 'registration') {
    return (
      <CampaignRegistrationStep
        campaignConfig={campaign.config}
        eyebrow={currentPage.eyebrow}
        title={currentPage.title}
        description={currentPage.description}
        submitLabel={currentPage.ctaLabel ?? 'Continue'}
        blocks={currentPage.blocks}
        showIdentityFields
        showDemographicFields={Boolean(combinedDemographicsPage)}
        identityHeading={currentPage.identityHeading}
        identityDescription={currentPage.identityDescription}
        demographicsHeading={combinedDemographicsPage?.demographicsHeading ?? currentPage.demographicsHeading}
        demographicsDescription={combinedDemographicsPage?.demographicsDescription ?? currentPage.demographicsDescription}
        consentEnabled={currentPage.consentEnabled}
        consentLabel={currentPage.consentLabel}
        consentDescription={currentPage.consentDescription}
        onSubmitParticipant={async (payload) => {
          const participantDetails = toParticipantDetails(payload)
          setParticipant(participantDetails)
          if (combinedDemographicsPage) {
            setDemographics(payload.demographics)
          }
          if (useInvitationBackedSubmit) {
            await registerParticipant(payload, combinedDemographicsPage ? payload.demographics : undefined)
          }
          moveToPage(combinedDemographicsPage ? 2 : 1)
        }}
      />
    )
  }

  if (currentPage.type === 'demographics') {
    return (
      <CampaignRegistrationStep
        campaignConfig={campaign.config}
        eyebrow={currentPage.eyebrow}
        title={currentPage.title}
        description={currentPage.description}
        submitLabel={currentPage.ctaLabel ?? 'Continue'}
        blocks={currentPage.blocks}
        showIdentityFields={false}
        showDemographicFields
        identityHeading={currentPage.identityHeading}
        identityDescription={currentPage.identityDescription}
        demographicsHeading={currentPage.demographicsHeading}
        demographicsDescription={currentPage.demographicsDescription}
        consentEnabled={currentPage.consentEnabled}
        consentLabel={currentPage.consentLabel}
        consentDescription={currentPage.consentDescription}
        onSubmitParticipant={async (payload) => {
          setDemographics(payload.demographics)
          moveToNextPage()
        }}
      />
    )
  }

  if (currentPage.type === 'assessment') {
    if (!activeAssessmentStep) {
      return (
        <section className="site-card-strong p-6 md:p-8">
          <p className="text-sm text-rose-700">The assessment for this page is unavailable.</p>
        </section>
      )
    }

    return (
      <AssessmentRunner
        assessment={activeAssessmentStep.assessment}
        questions={activeAssessmentStep.questions}
        runnerConfig={activeAssessmentStep.runnerConfig}
        showOpeningScreen={false}
        runtimeMode="v2"
        v2ExperienceConfig={activeAssessmentStep.v2ExperienceConfig}
        scale={activeAssessmentStep.scale}
        submitEndpoint={submitEndpoint}
        onResponsesReady={async (responses) => {
          setQueuedSubmissions((current) => [
            ...current,
            {
              assessmentId: activeAssessmentStep.assessment.id,
              responses,
            },
          ])
          moveToNextPage()
        }}
        headerContext={{
          label: 'Campaign',
          value: [campaign.name, campaign.organisation].filter(Boolean).join(' · '),
        }}
      />
    )
  }

  if (currentPage.type === 'screen') {
    return (
      <CampaignScreenView
        eyebrow={currentPage.eyebrow}
        title={currentPage.title}
        description={currentPage.description}
        blocks={currentPage.blocks}
        variant={screenVariant(currentPage)}
        action={<ScreenAction label={currentPage.ctaLabel ?? 'Continue'} onClick={moveToNextPage} />}
      />
    )
  }

  if (currentPage.type === 'finalising') {
    return (
      <div className="space-y-4">
        <AssessmentRunner
          assessment={{
            id: 'campaign-finalising',
            key: 'campaign-finalising',
            name: campaign.name,
            description: '',
          }}
          questions={[
            {
              id: 'campaign-finalising-question',
              question_key: 'campaign-finalising-question',
              text: 'Finalising this campaign flow',
              dimension: 'Campaign',
              is_reverse_coded: false,
              sort_order: 0,
            },
          ]}
          runnerConfig={resolvedJourney.runnerConfig}
          runtimeMode="v2"
          v2ExperienceConfig={resolvedJourney.experienceConfig}
          submitEndpoint={submitEndpoint}
          headerContext={{
            label: 'Campaign',
            value: [campaign.name, campaign.organisation].filter(Boolean).join(' · '),
          }}
          previewState="finalising"
        />
        {queueError ? (
          <section className="site-card-strong p-5 text-sm text-rose-700">
            <p>{queueError}</p>
            <div className="mt-4">
              <ScreenAction label={queueSubmitting ? 'Retrying...' : 'Retry'} onClick={() => {
                setQueueError(null)
                setQueueSubmitting(false)
                setFinalisingAttempt((current) => current + 1)
              }} />
            </div>
          </section>
        ) : null}
      </div>
    )
  }

  const completionHref = completionOutcome?.kind === 'report'
    ? completionOutcome.path
    : currentPage.ctaHref || resolvedJourney.runnerConfig.completion_screen_cta_href

  return (
    <CampaignScreenView
      eyebrow={currentPage.eyebrow}
      title={currentPage.title}
      description={currentPage.description}
      blocks={currentPage.blocks}
      variant="completion"
      action={
        completionHref ? (
          <CompletionAction href={completionHref} label={currentPage.ctaLabel ?? resolvedJourney.runnerConfig.completion_screen_cta_label} />
        ) : (
          <AssessmentPreviewAction label={currentPage.ctaLabel ?? resolvedJourney.runnerConfig.completion_screen_cta_label} />
        )
      }
    />
  )
}
