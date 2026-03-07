import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Print: Assessment Report',
  description: 'Print template for an assessment report.',
}

type Props = {
  searchParams: Promise<{ access?: string }>
}

export default async function AssessmentPrintPage({ searchParams }: Props) {
  const { access } = await searchParams
  redirect(`/assess/r/assessment?access=${encodeURIComponent(access ?? '')}&render=pdf`)
}
