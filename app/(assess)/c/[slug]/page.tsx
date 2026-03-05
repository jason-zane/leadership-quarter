import { redirect } from 'next/navigation'

export default async function LegacyCampaignLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  redirect(`/assess/c/${encodeURIComponent(slug)}`)
}
