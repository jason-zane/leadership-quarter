import { CampaignAssessmentFlow } from '@/components/assess/campaign-assessment-flow'
import { getPublicCampaignApiPath } from '@/utils/campaign-url'
import { getAssessmentRuntimeCampaign } from '@/utils/services/assessment-runtime-campaign'

type Props = {
  params: Promise<{ slug: string; campaignSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function campaignMessage(errorCode: string | undefined) {
  if (errorCode === 'campaign_not_found') return 'This campaign link does not match an active campaign slug.'
  if (errorCode === 'campaign_not_active') return 'This campaign is no longer accepting responses.'
  if (errorCode === 'campaign_limit_reached') return 'This campaign has reached its assessment limit.'
  if (errorCode === 'assessment_not_active') return 'The assessment for this campaign is currently unavailable.'
  return 'This campaign is unavailable.'
}

export default async function CampaignAssessmentPage({ params, searchParams }: Props) {
  const { slug: organisationSlug, campaignSlug } = await params
  await searchParams
  const result = await getAssessmentRuntimeCampaign({
    organisationSlug,
    campaignSlug,
  })

  if (!result.ok) {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Campaign</p>
          <h1 className="assess-title">Campaign unavailable</h1>
          <p className="assess-subtitle">{campaignMessage(result.error)}</p>
        </section>
      </div>
    )
  }

  const payload = result.data
  const apiBase = getPublicCampaignApiPath(campaignSlug, organisationSlug)

  return (
    <div className="assess-container">
      <CampaignAssessmentFlow
        campaign={payload.campaign}
        assessmentSteps={payload.assessmentSteps}
        resolvedJourney={payload.resolvedJourney}
        registerEndpoint={`${apiBase}/register`}
        submitEndpoint={`${apiBase}/submit`}
      />
    </div>
  )
}
