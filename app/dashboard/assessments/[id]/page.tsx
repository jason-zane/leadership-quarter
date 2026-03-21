import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { getAssessmentReadiness } from '@/utils/services/assessment-runtime'
import { createAdminClient } from '@/utils/supabase/admin'
import { V2AiReadinessSeedButton } from './_components/v2-ai-readiness-seed-button'

type Props = {
  params: Promise<{ id: string }>
}

export default async function AssessmentOverviewPage({ params }: Props) {
  const { id } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const [{ data: assessment }, readiness] = await Promise.all([
    adminClient
      .from('assessments')
      .select('id, key, name, external_name, report_config')
      .eq('id', id)
      .maybeSingle(),
    getAssessmentReadiness({
      adminClient,
      assessmentId: id,
    }),
  ])

  if (!assessment || !readiness) {
    notFound()
  }

  const reportConfig = assessment.report_config && typeof assessment.report_config === 'object'
    ? assessment.report_config as { v2_runtime_enabled?: boolean }
    : {}

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title={assessment.name}
        description="Readiness dashboard for structure, delivery, reports, and launch access."
        actions={(
          <div className="flex flex-wrap gap-3">
            {assessment.key === 'ai_readiness_orientation_v1' ? (
              <V2AiReadinessSeedButton assessmentId={assessment.id} />
            ) : null}
            {readiness.canPreview ? (
              <Link
                href={`/assess/p/${encodeURIComponent(assessment.key)}`}
                className="foundation-btn foundation-btn-primary foundation-btn-md"
              >
                Open assessment
              </Link>
            ) : null}
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <FoundationSurface className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Readiness</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">
            {readiness.readyCount}/{readiness.totalCount}
          </p>
          <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
            {readiness.canCutover
              ? 'Core prerequisites are in place for broader validation work.'
              : 'Some authoring or delivery prerequisites are still incomplete.'}
          </p>
        </FoundationSurface>

        <FoundationSurface className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Assessment route</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">
            {reportConfig.v2_runtime_enabled ? 'Enabled' : 'Disabled'}
          </p>
          <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
            Use the assessment workspace to refine the participant journey and launch path.
          </p>
        </FoundationSurface>

        <FoundationSurface className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Launch access</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">
            {readiness.canPreview ? 'Available' : 'Blocked'}
          </p>
          <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
            Open the assessment flow directly to review the participant experience end to end.
          </p>
        </FoundationSurface>
      </div>

      <FoundationSurface className="mt-6 p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Workspace checklist</h2>
          <p className="text-sm text-[var(--admin-text-muted)]">
            These checks show whether the workspace is ready for launch, validation, and deeper testing.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {readiness.checks.map((check) => (
            <div
              key={check.key}
              className="rounded-xl border border-[rgba(103,127,159,0.14)] bg-white/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{check.label}</p>
                <span className={[
                  'rounded-full px-2.5 py-1 text-xs font-medium',
                  check.ready
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700',
                ].join(' ')}>
                  {check.ready ? 'Ready' : 'Pending'}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--admin-text-muted)]">{check.detail}</p>
            </div>
          ))}
        </div>
      </FoundationSurface>

      <FoundationSurface className="mt-6 p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Validation issues</h2>
          <p className="text-sm text-[var(--admin-text-muted)]">
            Definition checks used by the assessment route, report assembly, and validation readiness.
          </p>
        </div>

        {readiness.issues.length === 0 ? (
          <p className="mt-5 text-sm text-emerald-700">No blocking or warning-level issues detected.</p>
        ) : (
          <div className="mt-5 grid gap-3">
            {readiness.issues.map((issue) => (
              <div
                key={issue.key}
                className="rounded-xl border border-[rgba(103,127,159,0.14)] bg-white/70 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{issue.message}</p>
                  <span className={[
                    'rounded-full px-2.5 py-1 text-xs font-medium',
                    issue.severity === 'error'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700',
                  ].join(' ')}>
                    {issue.severity === 'error' ? 'Error' : 'Warning'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </FoundationSurface>
    </DashboardPageShell>
  )
}
