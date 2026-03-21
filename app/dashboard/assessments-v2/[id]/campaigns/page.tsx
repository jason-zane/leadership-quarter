import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AssessmentV2CampaignsPage({ params }: Props) {
  const { id } = await params
  redirect('/dashboard/assessments/' + id + '/campaigns')
}
