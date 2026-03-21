import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AssessmentV2PsychometricsPage({ params }: Props) {
  const { id } = await params
  redirect('/dashboard/assessments/' + id + '/psychometrics')
}
