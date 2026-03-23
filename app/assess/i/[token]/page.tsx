import { AssessmentRunner } from '@/components/assess/assessment-runner'
import { CampaignAssessmentFlow } from '@/components/assess/campaign-assessment-flow'
import { getPublicCampaignApiPath } from '@/utils/campaign-url'
import { getRuntimeInvitationAssessment } from '@/utils/services/assessment-runtime-invitation'

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function invitationMessage(errorCode: string | undefined) {
  if (errorCode === 'invitation_expired') return 'This invitation has expired.'
  if (errorCode === 'invitation_completed') return 'This invitation has already been completed.'
  return 'This invitation could not be loaded.'
}

export default async function InvitationAssessmentPage({ params, searchParams }: Props) {
  const { token } = await params
  await searchParams

  const result = await getRuntimeInvitationAssessment({ token })

  if (!result.ok) {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Invitation</p>
          <h1 className="assess-title">Invitation unavailable</h1>
          <p className="assess-subtitle">{invitationMessage(result.error)}</p>
        </section>
      </div>
    )
  }

  const { data } = result

  if (data.campaignRuntime) {
    const { campaign, assessmentSteps, resolvedJourney, invitationAssessmentId } = data.campaignRuntime
    const apiBase = getPublicCampaignApiPath(campaign.slug, campaign.organisationSlug)

    return (
      <div className="assess-container">
        <CampaignAssessmentFlow
          campaign={campaign}
          assessmentSteps={assessmentSteps}
          resolvedJourney={resolvedJourney}
          registerEndpoint={`${apiBase}/register`}
          submitEndpoint={`${apiBase}/submit`}
          invitationContext={{
            token,
            assessmentId: invitationAssessmentId,
            participant: {
              firstName: data.invitation.firstName ?? '',
              lastName: data.invitation.lastName ?? '',
              email: '',
              organisation: data.invitation.organisation ?? '',
              role: data.invitation.role ?? '',
              consent: true,
            },
          }}
        />
      </div>
    )
  }

  return (
    <div className="assess-container">
      <AssessmentRunner
        assessment={data.assessment}
        questions={data.questions}
        runnerConfig={data.runnerConfig}
        runtimeMode="v2"
        v2ExperienceConfig={data.v2ExperienceConfig}
        scale={data.scale}
        submitEndpoint={`/api/assessments/invitation/${encodeURIComponent(token)}/submit`}
        headerContext={{
          label: 'Invited participant',
          value:
            [
              [data.invitation.firstName, data.invitation.lastName].filter(Boolean).join(' '),
              data.invitation.organisation,
            ]
              .filter(Boolean)
              .join(' · ') || 'Participant',
        }}
      />
    </div>
  )
}
