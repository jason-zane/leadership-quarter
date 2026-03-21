import { headers } from 'next/headers'
import { CampaignAssessmentFlow } from '@/components/assess/campaign-assessment-flow'
import { getPublicCampaignApiPath, getPublicCampaignRuntimeApiPath } from '@/utils/campaign-url'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import type { RunnerConfig } from '@/utils/assessments/experience-config'
import type { AssessmentV2ExperienceConfig } from '@/utils/assessments/assessment-experience-config'
import type { RuntimeAssessmentScale } from '@/utils/services/assessment-runtime-content'

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
  assessment?: {
    id: string
    key: string
    name: string
    description: string | null
    version?: number
  }
  questions?: Array<{
    id: string
    question_key: string
    text: string
    dimension: string
    is_reverse_coded: boolean
    sort_order: number
  }>
  runnerConfig?: RunnerConfig
  v2ExperienceConfig?: AssessmentV2ExperienceConfig
  scale?: RuntimeAssessmentScale
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
    !payload.assessment ||
    !payload.questions ||
    !payload.runnerConfig
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
        assessment={payload.assessment}
        questions={payload.questions}
        runnerConfig={payload.runnerConfig}
        runtimeMode="v2"
        v2ExperienceConfig={payload.v2ExperienceConfig}
        scale={payload.scale}
        submitEndpoint={`${getPublicCampaignApiPath(campaignSlug, organisationSlug)}/submit`}
      />
    </div>
  )
}
