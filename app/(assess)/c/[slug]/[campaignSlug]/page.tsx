import { redirect } from 'next/navigation'

// Compatibility alias for older campaign URLs. Canonical public route is /assess/c/[orgSlug]/[campaignSlug].
export default async function CampaignLandingPage({
  params,
}: {
  params: Promise<{ slug: string; campaignSlug: string }>
}) {
  const { slug, campaignSlug } = await params
  redirect(`/assess/c/${encodeURIComponent(slug)}/${encodeURIComponent(campaignSlug)}`)
}
