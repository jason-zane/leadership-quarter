import { redirect } from 'next/navigation'

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assessmentId } = await params
  redirect(`/dashboard/assessments/${assessmentId}/psychometrics`)
}
