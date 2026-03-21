import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { V2TabBar } from './_components/v2-tab-bar'

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export default async function AssessmentV2Layout({ params, children }: Props) {
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
      <nav className="backend-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard/assessments" className="hover:text-zinc-900 dark:hover:text-zinc-100">
          Assessments
        </Link>
        <span>/</span>
        <span className="text-[var(--admin-text-primary)]">{assessmentName}</span>
      </nav>

      <V2TabBar assessmentId={id} />

      <div>{children}</div>
    </div>
  )
}
