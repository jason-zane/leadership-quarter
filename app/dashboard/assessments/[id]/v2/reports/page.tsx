import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AssessmentV2ReportsPage({ params }: Props) {
  const { id } = await params
  redirect(`/dashboard/assessments-v2/${id}/reports`)
}
