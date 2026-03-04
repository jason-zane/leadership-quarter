import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { SurveyTabBar } from './_components/survey-tab-bar'

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export default async function AssessmentLayout({ params, children }: Props) {
  const { id } = await params
  const adminClient = createAdminClient()

  let assessmentName = 'Assessment'
  if (adminClient) {
    const { data } = await adminClient
      .from('assessments')
      .select('name')
      .eq('id', id)
      .maybeSingle()
    if (data?.name) assessmentName = data.name
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/dashboard/assessments" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Assessments
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{assessmentName}</span>
      </nav>

      {/* Tab bar */}
      <SurveyTabBar surveyId={id} />

      {/* Page content */}
      <div>{children}</div>
    </div>
  )
}
