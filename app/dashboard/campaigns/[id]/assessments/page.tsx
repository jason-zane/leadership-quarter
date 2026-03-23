import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function CampaignAssessmentsPage({ params }: Props) {
  const { id } = await params
  redirect(`/dashboard/campaigns/${id}`)
}
