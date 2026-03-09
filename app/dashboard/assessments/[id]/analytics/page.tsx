import { createAdminClient } from '@/utils/supabase/admin'
import { getAdminAssessmentAnalytics } from '@/utils/services/admin-assessment-analytics'
import { CohortComparison } from './_components/cohort-comparison'

type ReliabilitySignal = 'green' | 'amber' | 'red' | 'insufficient_data'

const SIGNAL_COLORS: Record<ReliabilitySignal, string> = {
  green: 'text-green-700 bg-green-50',
  amber: 'text-amber-700 bg-amber-50',
  red: 'text-red-700 bg-red-50',
  insufficient_data: 'text-[var(--site-text-muted)] bg-[var(--site-surface-tint)]',
}

const SIGNAL_LABELS: Record<ReliabilitySignal, string> = {
  green: 'Good (\u22650.70)',
  amber: 'Acceptable (0.60\u20130.70)',
  red: 'Low (<0.60)',
  insufficient_data: 'Insufficient data',
}

const FLAG_LABELS: Record<string, string> = {
  review_needed: 'Review needed (r<0.2)',
  potential_redundancy: 'Potential redundancy (r>0.7)',
}

const FLAG_COLORS: Record<string, string> = {
  review_needed: 'text-red-700 bg-red-50',
  potential_redundancy: 'text-amber-700 bg-amber-50',
}

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assessmentId } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const [result, cohortsResult, traitsResult] = await Promise.all([
    getAdminAssessmentAnalytics({ adminClient, assessmentId }),
    adminClient
      .from('assessment_cohorts')
      .select('id, name')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: false }),
    adminClient
      .from('assessment_traits')
      .select('id, code, name')
      .eq('assessment_id', assessmentId)
      .order('code'),
  ])

  if (!result.ok) {
    return <p className="text-sm text-red-600">Failed to load analytics.</p>
  }

  const { totalSubmissions, traits, classificationBreakdown, itemAnalytics, dimensionReliability } = result.data
  const cohorts = (cohortsResult.data ?? []) as { id: string; name: string }[]
  const traitsList = (traitsResult.data ?? []).map((t) => ({
    traitId: t.id,
    code: t.code,
    name: t.name,
  }))

  return (
    <div className="backend-page-content space-y-8">
      {/* Overview */}
      <section className="backend-section">
        <h2 className="backend-section-title">Overview</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4">
            <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Total submissions</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--site-text-primary)]">{totalSubmissions}</p>
          </div>
          <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4">
            <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Questions analysed</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--site-text-primary)]">{itemAnalytics.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4">
            <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Traits scored</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--site-text-primary)]">{traits.length}</p>
          </div>
          <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4">
            <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Items flagged</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-[var(--site-text-primary)]">
              {itemAnalytics.filter((i) => i.flag !== null).length}
            </p>
          </div>
        </div>
      </section>

      {/* Classification breakdown */}
      {classificationBreakdown.length > 0 && (
        <section className="backend-section">
          <h2 className="backend-section-title">Classification breakdown</h2>
          <div className="mt-3 space-y-2">
            {classificationBreakdown.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-sm font-medium text-[var(--site-text-primary)] truncate">{c.label}</div>
                <div className="flex-1">
                  <div className="relative h-5 overflow-hidden rounded bg-[var(--site-border)]">
                    <div
                      className="absolute left-0 top-0 h-full rounded bg-[var(--site-accent-strong)]"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right text-sm text-[var(--site-text-muted)] tabular-nums">
                  {c.count} ({c.pct}%)
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trait aggregates */}
      {traits.length > 0 && (
        <section className="backend-section">
          <h2 className="backend-section-title">Trait aggregates</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--site-border)]">
                  <th className="py-2 text-left font-semibold text-[var(--site-text-primary)]">Trait</th>
                  <th className="py-2 text-right font-semibold text-[var(--site-text-primary)]">n</th>
                  <th className="py-2 text-right font-semibold text-[var(--site-text-primary)]">Mean</th>
                  <th className="py-2 text-right font-semibold text-[var(--site-text-primary)]">SD</th>
                  <th className="py-2 text-right font-semibold text-[var(--site-text-primary)]">p25</th>
                  <th className="py-2 text-right font-semibold text-[var(--site-text-primary)]">p50</th>
                  <th className="py-2 text-right font-semibold text-[var(--site-text-primary)]">p75</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--site-border)]">
                {traits.map((t) => (
                  <tr key={t.traitId}>
                    <td className="py-2 text-[var(--site-text-primary)]">
                      {t.name}
                      <span className="ml-1.5 font-mono text-[11px] text-[var(--site-text-muted)]">{t.code}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-[var(--site-text-body)]">{t.count}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--site-text-body)]">{t.mean.toFixed(2)}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--site-text-body)]">{t.sd?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--site-text-body)]">{t.percentiles.p25?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--site-text-body)]">{t.percentiles.p50?.toFixed(2) ?? '—'}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--site-text-body)]">{t.percentiles.p75?.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Dimension reliability */}
      {dimensionReliability.length > 0 && (
        <section className="backend-section">
          <h2 className="backend-section-title">Dimension reliability (Cronbach&apos;s alpha)</h2>
          <div className="mt-3 space-y-3">
            {dimensionReliability.map((d) => (
              <div key={d.dimension} className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="w-40 shrink-0 text-sm font-medium text-[var(--site-text-primary)]">{d.dimension}</div>
                  <div className="text-sm tabular-nums text-[var(--site-text-body)]">
                    {d.alpha !== null ? d.alpha.toFixed(3) : '—'}
                    {d.alphaCI95 && (
                      <span className="ml-1.5 text-[var(--site-text-muted)]">
                        [95% CI: {d.alphaCI95.lower.toFixed(3)}&ndash;{d.alphaCI95.upper.toFixed(3)}]
                      </span>
                    )}
                    {d.n > 0 && <span className="ml-1.5 text-[var(--site-text-muted)]">(n={d.n})</span>}
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SIGNAL_COLORS[d.signal]}`}>
                    {SIGNAL_LABELS[d.signal]}
                  </span>
                </div>
                {d.sem !== null && (
                  <p className="mt-1.5 text-xs text-[var(--site-text-muted)]">
                    SEM = {d.sem.toFixed(3)} &nbsp;·&nbsp; 95% true-score band = score &plusmn; {(d.sem * 1.96).toFixed(3)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Item diagnostics */}
      {itemAnalytics.length > 0 && (
        <section className="backend-section">
          <h2 className="backend-section-title">Item diagnostics</h2>
          {totalSubmissions < 5 && (
            <p className="mt-1 text-xs text-[var(--site-text-muted)]">
              Correlations require at least 5 submissions for reliable estimates.
            </p>
          )}
          <div className="mt-3 space-y-3">
            {itemAnalytics.map((item) => (
              <div
                key={item.questionId}
                className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--site-text-primary)]">{item.text}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--site-text-muted)]">
                      {item.questionKey}{item.dimension ? ` · ${item.dimension}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    {item.flag && (
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${FLAG_COLORS[item.flag] ?? ''}`}>
                        {FLAG_LABELS[item.flag] ?? item.flag}
                      </span>
                    )}
                    {item.ceiling && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 bg-orange-50">
                        Ceiling ({Math.round(item.ceilingPct * 100)}%)
                      </span>
                    )}
                    {item.floor && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 bg-orange-50">
                        Floor ({Math.round(item.floorPct * 100)}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--site-text-muted)]">
                  <span>mean {item.mean.toFixed(2)}</span>
                  {item.sd !== null && <span>sd {item.sd.toFixed(2)}</span>}
                  {item.citc !== null && (
                    <span>r<sub>it</sub>(c) {item.citc.toFixed(3)}</span>
                  )}
                </div>

                <div className="mt-3 flex items-end gap-1.5">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const count = item.distribution[String(val)] ?? 0
                    const total = Object.values(item.distribution).reduce((a, b) => a + b, 0)
                    const heightPct = total > 0 ? (count / total) * 100 : 0
                    return (
                      <div key={val} className="flex flex-col items-center gap-0.5">
                        <div className="w-6 bg-[var(--site-surface)] flex items-end" style={{ height: '40px' }}>
                          <div
                            className="w-full rounded-t bg-[var(--site-accent-strong)] opacity-70"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--site-text-muted)]">{val}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cohort comparison */}
      <section className="backend-section">
        <h2 className="backend-section-title">Cohort comparison</h2>
        <p className="backend-section-subtitle mb-4">
          Welch&apos;s t-test comparing trait scores across two cohorts. Effect size: d&nbsp;&lt;&nbsp;0.2 negligible, 0.2&ndash;0.5 small, 0.5&ndash;0.8 medium, &ge;0.8 large.
        </p>
        {totalSubmissions >= 100 ? (
          <CohortComparison
            assessmentId={assessmentId}
            cohorts={cohorts}
            traits={traitsList}
          />
        ) : (
          <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-tint)] px-4 py-4">
            <p className="text-sm text-[var(--site-text-muted)]">
              Cohort comparison becomes reliable at 100+ total submissions (currently {totalSubmissions}).
              The tool is available now but interpret results cautiously with small samples.
            </p>
            {cohorts.length >= 2 && traitsList.length > 0 && (
              <div className="mt-3">
                <CohortComparison
                  assessmentId={assessmentId}
                  cohorts={cohorts}
                  traits={traitsList}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {itemAnalytics.length === 0 && totalSubmissions === 0 && (
        <p className="text-sm text-[var(--site-text-muted)]">
          No submissions yet. Analytics will appear once participants complete this assessment.
        </p>
      )}
    </div>
  )
}
