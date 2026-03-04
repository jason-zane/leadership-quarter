import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { CampaignFlow } from './_campaign-flow'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'

type Props = {
  params: Promise<{ slug: string }>
}

type AssessmentEntry = {
  id: string
  assessment: {
    id: string
    key: string
    name: string
    description: string | null
  }
}

type CampaignPayload = {
  ok?: boolean
  error?: string
  campaign?: {
    id: string
    name: string
    slug: string
    config: CampaignConfig
    organisation: string | null
  }
  assessments?: AssessmentEntry[]
  assessment?: AssessmentEntry['assessment']
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Assessment — ${slug}`,
    description: 'Complete your assessment.',
  }
}

export default async function CampaignLandingPage({ params }: Props) {
  const { slug } = await params
  const headerStore = await headers()
  const host = headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/assessments/campaigns/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  }).catch(() => null)

  const payload = (await response?.json().catch(() => null)) as CampaignPayload | null

  const selectedAssessment = payload?.assessment

  if (!response?.ok || !payload?.ok || !payload.campaign || !selectedAssessment) {
    const errorCode = payload?.error

    let heading = 'Campaign unavailable'
    let message = 'This campaign link is not available.'

    if (errorCode === 'campaign_not_active') {
      heading = 'Campaign closed'
      message = 'This campaign is no longer accepting responses.'
    } else if (errorCode === 'survey_not_active') {
      heading = 'Assessment unavailable'
      message = 'The assessment for this campaign is currently unavailable.'
    }

    return (
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-[var(--site-text-primary)] md:px-12">
        <div className="site-card-strong p-8 md:p-10">
          <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
            Assessment
          </p>
          <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">{heading}</h1>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{message}</p>
        </div>
      </div>
    )
  }

  const { campaign } = payload

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-[var(--site-text-primary)] md:px-12">
      <CampaignFlow
        campaignSlug={campaign.slug}
        campaignConfig={campaign.config}
        assessmentName={selectedAssessment.name}
        assessmentDescription={selectedAssessment.description}
        organisationName={campaign.organisation}
      />
    </div>
  )
}
