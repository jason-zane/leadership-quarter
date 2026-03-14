import { redirect } from 'next/navigation'
import { LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG } from '@/utils/campaign-url'

export default async function LegacyCampaignAssessmentPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/assess/c/${encodeURIComponent(LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG)}/${encodeURIComponent(slug)}`)
}
