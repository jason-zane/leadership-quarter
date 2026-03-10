import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ValidationRunApproveButton } from '@/app/dashboard/assessments/[id]/psychometrics/_components/validation-run-approve-button'
import { Badge } from '@/components/ui/badge'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { getPsychometricAnalysisRunDetail } from '@/utils/services/psychometric-analysis-runs'
import { createAdminClient } from '@/utils/supabase/admin'

type FactorModel = {
  id: string
  model_kind: string
  model_name: string
  factor_count: number
  grouping_variable: string | null
  group_key: string | null
  adequacy: Record<string, unknown> | null
  fit_indices: Record<string, unknown> | null
  factor_correlations: Record<string, unknown> | null
  summary: Record<string, unknown> | null
}

type FactorLoading = {
  factor_model_id: string
  scale_key: string
  question_key: string
  factor_key: string
  loading: number | null
  standardized_loading: number | null
  communality: number | null
  uniqueness: number | null
  cross_loading: boolean
  retained: boolean
}

type Recommendation = {
  id: string
  scope: string
  target_key: string | null
  severity: 'info' | 'warning' | 'critical'
  code: string
  message: string
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatNumber(value: unknown, digits = 3) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return value.toFixed(digits)
}

function severityBadgeVariant(severity: Recommendation['severity']) {
  switch (severity) {
    case 'critical':
      return 'signal-red'
    case 'warning':
      return 'signal-amber'
    default:
      return 'signal-blue'
  }
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'approved':
      return 'signal-green'
    case 'completed':
      return 'signal-blue'
    case 'failed':
      return 'signal-red'
    case 'running':
      return 'signal-amber'
    default:
      return 'signal-grey'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'completed':
      return 'Ready to review'
    case 'failed':
      return 'Needs fixing'
    case 'running':
      return 'In progress'
    default:
      return 'Queued'
  }
}

function runDecision(input: {
  status: string
  approved: boolean
  warningsCount: number
  criticalCount: number
  warningCount: number
}) {
  if (input.approved) {
    return {
      label: 'Current approved reference',
      variant: 'signal-green',
      summary: 'This run is already the approved reference point for the assessment.',
    }
  }

  if (input.status !== 'completed') {
    return {
      label: 'Not ready',
      variant: 'signal-red',
      summary: 'Do not approve this run yet. It is not in a completed reviewable state.',
    }
  }

  if (input.criticalCount > 0 || input.warningsCount > 0 || input.warningCount > 0) {
    return {
      label: 'Approve with caution',
      variant: 'signal-amber',
      summary: 'The run is complete, but it still carries warnings or critical recommendations that need a human judgment call.',
    }
  }

  return {
    label: 'Ready to approve',
    variant: 'signal-green',
    summary: 'The run is complete and does not currently show stored warnings or critical recommendations.',
  }
}

function runStatusHint(status: string) {
  switch (status) {
    case 'approved':
      return 'This check has been accepted as the current reference point for the assessment.'
    case 'completed':
      return 'The check finished successfully and is ready for review.'
    case 'failed':
      return 'The check did not complete successfully and should not be trusted or approved.'
    case 'running':
      return 'The check is still being processed, so the evidence is not final yet.'
    default:
      return 'The check has been queued but has not finished yet.'
  }
}

export default async function ValidationRunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>
}) {
  const { id: assessmentId, runId } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const [assessmentResult, detailResult] = await Promise.all([
    adminClient
      .from('assessments')
      .select('id, name, approved_analysis_run_id')
      .eq('id', assessmentId)
      .maybeSingle(),
    getPsychometricAnalysisRunDetail({
      adminClient,
      assessmentId,
      runId,
    }),
  ])

  if (assessmentResult.error || !assessmentResult.data) {
    notFound()
  }

  if (!detailResult.ok) {
    notFound()
  }

  const assessment = assessmentResult.data
  const { run, scaleDiagnostics, itemDiagnostics, factorModels, factorLoadings, recommendations } =
    detailResult.data

  // Fetch global norm group n for the approve button
  const globalNormResult = await adminClient
    .from('norm_groups')
    .select('n')
    .eq('assessment_id', assessmentId)
    .eq('is_global', true)
    .limit(1)
    .maybeSingle()
  const normGroupN = globalNormResult.data?.n ?? 0

  const approved = assessment.approved_analysis_run_id === run.id
  const factorModelRows = factorModels as FactorModel[]
  const factorLoadingRows = factorLoadings as FactorLoading[]
  const recommendationRows = recommendations as Recommendation[]
  const loadingsByModel = factorLoadingRows.reduce<Map<string, FactorLoading[]>>((acc, loading) => {
    const list = acc.get(loading.factor_model_id) ?? []
    list.push(loading)
    acc.set(loading.factor_model_id, list)
    return acc
  }, new Map())
  const recommendationsBySeverity = recommendationRows.reduce<Record<string, Recommendation[]>>(
    (acc, recommendation) => {
      const key = recommendation.severity
      acc[key] = [...(acc[key] ?? []), recommendation]
      return acc
    },
    {}
  )
  const criticalRecommendations = recommendationRows.filter((item) => item.severity === 'critical').length
  const warningRecommendations = recommendationRows.filter((item) => item.severity === 'warning').length
  const decision = runDecision({
    status: run.status,
    approved,
    warningsCount: run.warnings?.length ?? 0,
    criticalCount: criticalRecommendations,
    warningCount: warningRecommendations,
  })

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link
              href={`/dashboard/assessments/${assessmentId}/psychometrics`}
              className="text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
            >
              Back to psychometric workspace
            </Link>
            <div className="space-y-2">
              <p className="text-xs text-[var(--admin-text-muted)]">{assessment.name}</p>
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--admin-text)]">
                Review this model check
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">
                Use this page to decide whether this saved check is trustworthy enough to become the current reference
                point for the assessment.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(run.status)}>
                {statusLabel(run.status)}
              </Badge>
              {approved && (
                <Badge variant="signal-green">Current approved model</Badge>
              )}
            </div>
            <p className="text-xs text-[var(--admin-text-muted)] max-w-xs text-right">
              {runStatusHint(run.status)}
            </p>
            {run.status === 'completed' && !approved && (
              <ValidationRunApproveButton assessmentId={assessmentId} runId={run.id} normGroupN={normGroupN} />
            )}
            <p className="text-xs text-[var(--admin-text-muted)]">
              created {formatDateTime(run.created_at)} &middot; completed {formatDateTime(run.completed_at)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Sample n', value: run.sample_n },
            { label: 'Factor models', value: factorModelRows.length },
            { label: 'Loadings', value: factorLoadingRows.length },
            { label: 'Recommendations', value: recommendationRows.length },
          ].map((metric) => (
            <div key={metric.label} className="rounded-[20px] border border-[var(--admin-border)] bg-white/72 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">{metric.label}</p>
              <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[var(--admin-text)]">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Should you trust this check?</h2>
            <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
              Start with the decision banner below. Then confirm what approval changes, what it does not change, and
              whether the saved warnings and recommendations are acceptable.
            </p>
          </div>
          <Link
            href={`/dashboard/assessments/${assessmentId}/psychometrics?section=analysis`}
            className="text-sm font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-strong)]"
          >
            Back to math QA
          </Link>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--admin-text-muted)]">Decision banner</p>
                <p className="mt-2 text-lg font-semibold text-[var(--admin-text)]">{decision.label}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">{decision.summary}</p>
              </div>
              <Badge variant={decision.variant}>{decision.label}</Badge>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {[
              {
                title: 'What this page is',
                body: 'A saved evidence pack showing whether the current question model still behaves acceptably in the data.',
              },
              {
                title: 'What changes if you approve',
                body: 'This run becomes the current approved reference point shown in the workspace.',
              },
              {
                title: 'What does not change',
                body: 'Raw answers, stored submissions, and participant scoring behavior do not automatically change in this phase.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[24px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">{item.body}</p>
              </div>
            ))}
          </div>

          <details className="rounded-[28px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--admin-text)]">
              Guidance for reading the advanced metrics
            </summary>
            <div className="mt-4 grid gap-4 xl:grid-cols-4">
              {[
                { title: 'Adequacy', body: 'Prefer KMO above roughly 0.60. Weak adequacy can mean the item pool is too thin or too noisy.' },
                { title: 'Loadings', body: 'Strong retained items usually load around 0.40+ on the intended factor and avoid heavy cross-loading.' },
                { title: 'Fit', body: 'Better models trend toward higher CFI and TLI, with lower RMSEA and SRMR.' },
                { title: 'Approval', body: 'Approve only when the run is complete, warnings are understood, and workspace math checks are clean.' },
              ].map((item) => (
                <div key={item.title} className="rounded-[18px] border border-[var(--admin-border)] bg-white/72 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">{item.body}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>

      {(run.warnings?.length ?? 0) > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--admin-text)]">Things to be careful about</h2>
          <div className="space-y-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4">
            {run.warnings.map((warning: unknown, index: number) => (
              <p key={`warning-${index}`} className="text-sm text-amber-800">
                {typeof warning === 'string'
                  ? warning
                  : String((warning as Record<string, unknown>).message ?? (warning as Record<string, unknown>).code ?? 'warning')}
              </p>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--admin-text)]">What this check found</h2>
          <p className="text-sm text-[var(--admin-text-muted)]">
            This is the compact machine summary saved with the run. Use it as a quick overview before opening advanced
            evidence tables.
          </p>
          <DashboardDataTableShell>
            <table className="w-full text-left text-sm">
              <tbody>
                {Object.entries((run.summary ?? {}) as Record<string, unknown>).map(([key, value]) => (
                  <tr key={key} className="border-t border-[rgba(103,127,159,0.12)] hover:bg-[rgba(103,127,159,0.04)]">
                    <td className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
                      {key.replaceAll('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text)]">
                      {typeof value === 'number'
                        ? formatNumber(value, 0)
                        : typeof value === 'string'
                          ? value
                          : JSON.stringify(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardDataTableShell>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[var(--admin-text)]">What needs attention</h2>
          <p className="text-sm text-[var(--admin-text-muted)]">
            These recommendations are the easiest place to start if you are not reading the deeper psychometric tables.
          </p>
          <div className="space-y-3">
            {(['critical', 'warning', 'info'] as const).map((severity) => {
              const items = recommendationsBySeverity[severity] ?? []
              if (items.length === 0) return null
              return (
                <div key={severity} className="rounded-[28px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={severityBadgeVariant(severity)}>{severity}</Badge>
                    <span className="text-xs text-[var(--admin-text-muted)]">{items.length} item(s)</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-[18px] border border-[var(--admin-border)] bg-white/72 px-3 py-3">
                        <p className="text-sm font-semibold text-[var(--admin-text)]">{item.message}</p>
                        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                          {item.scope}
                          {item.target_key ? ` · ${item.target_key}` : ''}
                          {item.code ? ` · ${item.code}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {recommendationRows.length === 0 && (
              <div className="rounded-[24px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-sm text-[var(--admin-text-muted)]">
                  No recommendation records were stored for this run.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <details className="space-y-4">
        <summary className="cursor-pointer list-none">
          <div>
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Advanced evidence from the data</h2>
            <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
              Open this when you want the deeper factor-model evidence, fit metrics, and loading tables behind the
              decision summary above.
            </p>
          </div>
        </summary>
        <div className="mt-4 space-y-4">
          {factorModelRows.length === 0 ? (
            <div className="rounded-[24px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
              <p className="text-sm text-[var(--admin-text-muted)]">
                No factor models were persisted for this run.
              </p>
            </div>
          ) : (
            factorModelRows.map((model) => {
              const loadings = loadingsByModel.get(model.id) ?? []
              const fitEntries = Object.entries(model.fit_indices ?? {}).filter(([, value]) => value !== null)
              const adequacyEntries = Object.entries(model.adequacy ?? {}).filter(([, value]) => value !== null)
              return (
                <div key={model.id} className="rounded-[28px] border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="signal-blue">{model.model_kind}</Badge>
                        <Badge variant="signal-grey">{model.factor_count} factor{model.factor_count === 1 ? '' : 's'}</Badge>
                        {model.group_key && (
                          <Badge variant="signal-grey">{model.group_key}</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-base font-semibold text-[var(--admin-text)]">
                        {model.model_name.replaceAll('_', ' ')}
                      </p>
                    </div>
                    {model.grouping_variable && (
                      <p className="text-sm text-[var(--admin-text-muted)]">
                        split by {model.grouping_variable}
                      </p>
                    )}
                  </div>

                  {(fitEntries.length > 0 || adequacyEntries.length > 0) && (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {fitEntries.length > 0 && (
                        <div className="rounded-[20px] border border-[var(--admin-border)] bg-white/72 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">Fit indices</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {fitEntries.map(([key, value]) => (
                              <div key={key} className="rounded-[16px] bg-[var(--admin-surface-alt)] px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
                                  {key}
                                </p>
                                <p className="mt-1 text-lg font-semibold text-[var(--admin-text)]">
                                  {formatNumber(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {adequacyEntries.length > 0 && (
                        <div className="rounded-[20px] border border-[var(--admin-border)] bg-white/72 p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">Adequacy checks</p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {adequacyEntries.map(([key, value]) => (
                              <div key={key} className="rounded-[16px] bg-[var(--admin-surface-alt)] px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-muted)]">
                                  {key.replaceAll('_', ' ')}
                                </p>
                                <p className="mt-1 text-sm text-[var(--admin-text)]">
                                  {typeof value === 'number'
                                    ? formatNumber(value)
                                    : JSON.stringify(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {loadings.length > 0 && (
                    <DashboardDataTableShell>
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em]">
                          <tr>
                            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Item</th>
                            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Scale</th>
                            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Factor</th>
                            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Std loading</th>
                            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Communality</th>
                            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Uniqueness</th>
                            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Flags</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadings.map((loading, index) => (
                            <tr key={`${model.id}-${loading.question_key}-${index}`} className="border-t border-[rgba(103,127,159,0.12)] hover:bg-[rgba(103,127,159,0.04)]">
                              <td className="px-4 py-3 font-mono text-xs text-[var(--admin-text)]">
                                {loading.question_key}
                              </td>
                              <td className="px-4 py-3">{loading.scale_key}</td>
                              <td className="px-4 py-3">{loading.factor_key}</td>
                              <td className="px-4 py-3">{formatNumber(loading.standardized_loading)}</td>
                              <td className="px-4 py-3">{formatNumber(loading.communality)}</td>
                              <td className="px-4 py-3">{formatNumber(loading.uniqueness)}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  {loading.cross_loading && (
                                    <Badge variant="signal-amber">Cross-loading</Badge>
                                  )}
                                  {!loading.retained && (
                                    <Badge variant="signal-red">Review</Badge>
                                  )}
                                  {loading.retained && !loading.cross_loading && (
                                    <Badge variant="signal-green">Retained</Badge>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </DashboardDataTableShell>
                  )}
                </div>
              )
            })
          )}
        </div>
      </details>

      <details className="space-y-4">
        <summary className="cursor-pointer list-none">
          <div>
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Advanced scale detail</h2>
            <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
              Open this for scale-level technical detail such as consistency, missingness, and complete sample counts.
            </p>
          </div>
        </summary>
        <div className="mt-4">
          <DashboardDataTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em]">
                <tr>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Scale</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Source</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Items</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Complete n</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Scale consistency</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Score uncertainty</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Missing</th>
                </tr>
              </thead>
              <tbody>
                {scaleDiagnostics.map((scale: Record<string, unknown>, index: number) => (
                  <tr key={`${String(scale.scale_key ?? index)}-${index}`} className="border-t border-[rgba(103,127,159,0.12)] hover:bg-[rgba(103,127,159,0.04)]">
                    <td className="px-4 py-3">{String(scale.scale_label ?? scale.scale_key ?? 'Scale')}</td>
                    <td className="px-4 py-3">{String(scale.source ?? '—')}</td>
                    <td className="px-4 py-3">{formatNumber(scale.item_count, 0)}</td>
                    <td className="px-4 py-3">{formatNumber(scale.complete_n, 0)}</td>
                    <td className="px-4 py-3">{formatNumber(scale.alpha)}</td>
                    <td className="px-4 py-3">{formatNumber(scale.sem)}</td>
                    <td className="px-4 py-3">{formatNumber(scale.missing_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardDataTableShell>
        </div>
      </details>

      <details className="space-y-4">
        <summary className="cursor-pointer list-none">
          <div>
            <h2 className="text-xl font-semibold text-[var(--admin-text)]">Advanced question detail</h2>
            <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
              Open this when you want the question-level technical detail used by the psychometric checks.
            </p>
          </div>
        </summary>
        <div className="mt-4">
          <DashboardDataTableShell>
            <table className="w-full text-left text-sm">
              <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em]">
                <tr>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Item</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Scale</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Mean</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">SD</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Works with its scale</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Scale consistency if removed</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Missing</th>
                  <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Flags</th>
                </tr>
              </thead>
              <tbody>
                {itemDiagnostics.map((item: Record<string, unknown>, index: number) => (
                  <tr key={`${String(item.question_key ?? index)}-${index}`} className="border-t border-[rgba(103,127,159,0.12)] hover:bg-[rgba(103,127,159,0.04)]">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-[var(--admin-text)]">
                        {String(item.question_key ?? 'item')}
                      </div>
                      <div className="text-xs text-[var(--admin-text-muted)]">
                        {String(item.item_label ?? 'Item')}
                      </div>
                    </td>
                    <td className="px-4 py-3">{String(item.scale_key ?? '—')}</td>
                    <td className="px-4 py-3">{formatNumber(item.mean)}</td>
                    <td className="px-4 py-3">{formatNumber(item.sd)}</td>
                    <td className="px-4 py-3">{formatNumber(item.citc)}</td>
                    <td className="px-4 py-3">{formatNumber(item.alpha_if_deleted)}</td>
                    <td className="px-4 py-3">{formatNumber(item.missing_rate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {item.reverse_scored === true && (
                          <Badge variant="signal-blue">Reverse</Badge>
                        )}
                        {typeof item.ceiling_pct === 'number' && item.ceiling_pct >= 0.3 && (
                          <Badge variant="signal-amber">Ceiling</Badge>
                        )}
                        {typeof item.floor_pct === 'number' && item.floor_pct >= 0.3 && (
                          <Badge variant="signal-amber">Floor</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardDataTableShell>
        </div>
      </details>
    </div>
  )
}

