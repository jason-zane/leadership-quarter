import { headers } from 'next/headers'
import { CampaignAssessmentFlow } from '@/components/assess/campaign-assessment-flow'
import { getPublicCampaignApiPath, getPublicCampaignRuntimeApiPath } from '@/utils/campaign-url'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import type { CampaignJourneyResolved } from '@/utils/assessments/campaign-journey'
import type { CampaignRuntimeAssessmentStep } from '@/utils/services/assessment-runtime-campaign'

type Props = {
  params: Promise<{ slug: string; campaignSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type RuntimePayload = {
  ok?: boolean
  error?: string
  campaign?: {
    slug: string
    organisationSlug: string
    name: string
    organisation: string | null
    config: CampaignConfig
  }
  assessmentSteps?: CampaignRuntimeAssessmentStep[]
  resolvedJourney?: CampaignJourneyResolved
}

function campaignMessage(errorCode: string | undefined) {
  if (errorCode === 'campaign_not_active') return 'This campaign is no longer accepting responses.'
  if (errorCode === 'campaign_limit_reached') return 'This campaign has reached its assessment limit.'
  if (errorCode === 'assessment_not_active') return 'The assessment for this campaign is currently unavailable.'
  return 'This campaign is unavailable.'
}

export default async function CampaignAssessmentPage({ params, searchParams }: Props) {
  const { slug: organisationSlug, campaignSlug } = await params
  await searchParams
  const headerStore = await headers()
  const host = headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

  const response = await fetch(
    `${baseUrl}${getPublicCampaignRuntimeApiPath(campaignSlug, organisationSlug)}`,
    { cache: 'no-store' }
  ).catch(() => null)

  const payload = (await response?.json().catch(() => null)) as RuntimePayload | null

  if (
    !response?.ok ||
    !payload?.ok ||
    !payload.campaign ||
    !payload.assessmentSteps ||
    !payload.resolvedJourney
  ) {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Campaign</p>
          <h1 className="assess-title">Campaign unavailable</h1>
          <p className="assess-subtitle">{campaignMessage(payload?.error)}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="assess-container">
      <CampaignAssessmentFlow
        campaign={payload.campaign}
        assessmentSteps={payload.assessmentSteps}
        resolvedJourney={payload.resolvedJourney}
        submitEndpoint={`${getPublicCampaignApiPath(campaignSlug, organisationSlug)}/submit`}
      />
    </div>
  )
}
