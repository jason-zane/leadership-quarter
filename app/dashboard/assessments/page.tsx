import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { PlusIcon } from '@/components/icons'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { DashboardFilterBar } from '@/components/dashboard/ui/filter-bar'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { AssessmentLibraryRowActions } from './_components/assessment-library-row-actions'

type AssessmentRow = {
  id: string
  name: string
  external_name: string
  status: string
  is_public: boolean
  updated_at: string
}

type Props = {
  searchParams: Promise<{ showArchived?: string }>
}

export default async function AssessmentsV2Page({ searchParams }: Props) {
  const { showArchived } = await searchParams
  const includeArchived = showArchived === '1'

  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  let query = adminClient
    .from('assessments')
    .select('id, name, external_name, status, is_public, updated_at')
    .order('updated_at', { ascending: false })

  if (!includeArchived) {
    query = query.neq('status', 'archived')
  }

  const { data } = await query

  const assessments = (data ?? []) as AssessmentRow[]
  const archivedCount = assessments.filter((assessment) => assessment.status === 'archived').length
  const publicCount = assessments.filter((assessment) => assessment.is_public).length

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessments"
        title="Assessment library"
        description="Open the assessment workspace for structure, delivery, reports, and responses."
        actions={(
          <Link
            href="/dashboard/assessments/new"
            className="foundation-btn foundation-btn-primary foundation-btn-md inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4" />
            New assessment
          </Link>
        )}
      />

      <DashboardKpiStrip
        items={[
          { label: 'In view', value: assessments.length },
          { label: 'Public', value: publicCount },
          { label: 'Visible archived', value: archivedCount },
        ]}
      />

      <DashboardFilterBar>
        <div>
          <p className="admin-filter-copy">
            Use the same catalogue view, but open each assessment in the dedicated workspace.
          </p>
        </div>
        <div className="admin-toggle-group" role="tablist" aria-label="Assessment visibility">
          <Link
            href="/dashboard/assessments"
            className={['admin-toggle-pill', includeArchived ? '' : 'admin-toggle-pill-active'].filter(Boolean).join(' ')}
          >
            Active view
          </Link>
          <Link
            href="/dashboard/assessments?showArchived=1"
            className={['admin-toggle-pill', includeArchived ? 'admin-toggle-pill-active' : ''].filter(Boolean).join(' ')}
          >
            Include archived
          </Link>
        </div>
      </DashboardFilterBar>

      <DashboardDataTableShell>
        <table className="admin-data-table">
          <thead>
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Last activity</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((assessment) => (
              <tr key={assessment.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/assessments/${assessment.id}`}
                    className="font-medium text-[var(--admin-text-primary)] hover:underline"
                  >
                    {assessment.name}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{assessment.external_name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={[
                    'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                    assessment.status === 'archived'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]',
                  ].join(' ')}>
                    {assessment.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--admin-text-muted)]">{assessment.is_public ? 'Public' : 'Private'}</td>
                <td className="px-4 py-3 text-[var(--admin-text-muted)]">{new Date(assessment.updated_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end">
                    <AssessmentLibraryRowActions
                      assessmentId={assessment.id}
                      assessmentName={assessment.name}
                      assessmentStatus={assessment.status}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {assessments.length === 0 ? (
              <tr className="admin-data-table-empty">
                <td colSpan={5}>
                  {includeArchived ? 'No assessments found.' : 'No active assessments. Switch to “Include archived” to review earlier versions.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
