import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function CampaignAdvancedAssessmentsPage({ params }: Props) {
  const { id } = await params
  redirect(`/dashboard/campaigns/${id}/journey`)
}
