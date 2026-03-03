import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { CampaignFlow } from './_campaign-flow'
import type { CampaignConfig } from '@/utils/surveys/campaign-types'

type Props = {
  params: Promise<{ slug: string }>
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
  survey?: {
    id: string
    key: string
    name: string
    description: string | null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Survey — ${slug}`,
    description: 'Complete your survey.',
  }
}

export default async function CampaignLandingPage({ params }: Props) {
  const { slug } = await params
  const headerStore = await headers()
  const host = headerStore.get('host')
  const proto = headerStore.get('x-forwarded-proto') || 'https'
  const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/surveys/campaigns/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  }).catch(() => null)

  const payload = (await response?.json().catch(() => null)) as CampaignPayload | null

  if (!response?.ok || !payload?.ok || !payload.campaign || !payload.survey) {
    const errorCode = payload?.error

    let heading = 'Campaign unavailable'
    let message = 'This campaign link is not available.'

    if (errorCode === 'campaign_not_active') {
      heading = 'Campaign closed'
      message = 'This campaign is no longer accepting responses.'
    } else if (errorCode === 'survey_not_active') {
      heading = 'Survey unavailable'
      message = 'The survey for this campaign is currently unavailable.'
    }

    return (
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
        <div className="site-card-strong p-8 md:p-10">
          <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
            Survey
          </p>
          <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">{heading}</h1>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{message}</p>
        </div>
      </div>
    )
  }

  const { campaign, survey } = payload

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <CampaignFlow
        campaignSlug={campaign.slug}
        campaignConfig={campaign.config}
        surveyName={survey.name}
        surveyDescription={survey.description}
        organisationName={campaign.organisation}
      />
    </div>
  )
}
