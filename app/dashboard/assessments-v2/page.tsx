import { redirect } from 'next/navigation'

type Props = {
  searchParams: Promise<{ showArchived?: string }>
}

export default async function AssessmentsV2Page({ searchParams }: Props) {
  const { showArchived } = await searchParams
  redirect(showArchived === '1' ? '/dashboard/assessments?showArchived=1' : '/dashboard/assessments')
}
