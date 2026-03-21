import { redirect } from 'next/navigation'
import { LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG } from '@/utils/campaign-url'

// Compatibility alias for older campaign URLs. Canonical public route is /assess/c/[orgSlug]/[campaignSlug].
export default async function LegacyCampaignLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/assess/c/${encodeURIComponent(LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG)}/${encodeURIComponent(slug)}`)
}
