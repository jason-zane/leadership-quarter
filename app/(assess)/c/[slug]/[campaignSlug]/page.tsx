import { redirect } from 'next/navigation'

export default async function CampaignLandingPage({
  params,
}: {
  params: Promise<{ slug: string; campaignSlug: string }>
}) {
  const { slug, campaignSlug } = await params
  redirect(`/assess/c/${encodeURIComponent(slug)}/${encodeURIComponent(campaignSlug)}`)
}
