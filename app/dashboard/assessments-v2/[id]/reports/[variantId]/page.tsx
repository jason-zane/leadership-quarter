import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string; variantId: string }>
}

export default async function AssessmentV2ReportPage({ params }: Props) {
  const { id, variantId } = await params
  redirect(`/dashboard/assessments/${id}/reports/${variantId}`)
}
