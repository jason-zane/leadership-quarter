import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ id: string; submissionId: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function AssessmentV2ResponseDetailPage({ params, searchParams }: Props) {
  const { id, submissionId } = await params
  const query = await searchParams
  const suffix = query.tab ? '?tab=' + encodeURIComponent(query.tab) : ''
  redirect('/dashboard/assessments/' + id + '/responses/' + submissionId + suffix)
}
