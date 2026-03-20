import { redirect } from 'next/navigation'

export default async function CampaignExperienceRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/campaigns/${id}/journey`)
}
