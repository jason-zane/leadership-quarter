import { headers } from 'next/headers'
import { CampaignAssessmentFlow } from '@/components/assess/campaign-assessment-flow'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import type { RunnerConfig } from '@/utils/assessments/experience-config'

type Props = { params: Promise<{ slug: string }> }

type RuntimePayload = {
  ok?: boolean
  error?: string
  campaign?: {
    slug: string
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
}

function campaignMessage(errorCode: string | undefined) {
  if (errorCode === 'campaign_not_active') return 'This campaign is no longer accepting responses.'
  if (errorCode === 'assessment_not_active') return 'The assessment for this campaign is currently unavailable.'
  return 'This campaign is unavailable.'
}

export default async function CampaignAssessmentPage({ params }: Props) {
  const { slug } = await params
  const headerStore = await headers()
  const host = headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

  const response = await fetch(
    `${baseUrl}/api/assessments/runtime/campaign/${encodeURIComponent(slug)}`,
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
      />
    </div>
  )
}
