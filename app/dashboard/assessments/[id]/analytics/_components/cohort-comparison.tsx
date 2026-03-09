'use client'

import { useState } from 'react'

type Cohort = { id: string; name: string }
type Trait = { traitId: string; name: string; code: string }

type ComparisonResult = {
  traitName: string
  groupA: { cohortName: string; n: number; mean: number; sd: number | null }
  groupB: { cohortName: string; n: number; mean: number; sd: number | null }
  t: number
  df: number
  pValue: number
  cohenD: number
  meanDiff: number
  ci95: { lower: number; upper: number }
  effectSizeLabel: 'negligible' | 'small' | 'medium' | 'large'
}

const EFFECT_COLORS: Record<string, string> = {
  negligible: 'text-[var(--site-text-muted)] bg-[var(--site-surface-tint)]',
  small: 'text-blue-700 bg-blue-50',
  medium: 'text-amber-700 bg-amber-50',
  large: 'text-purple-700 bg-purple-50',
}

export function CohortComparison({
  assessmentId,
  cohorts,
  traits,
}: {
  assessmentId: string
  cohorts: Cohort[]
  traits: Trait[]
}) {
  const [cohortA, setCohortA] = useState(cohorts[0]?.id ?? '')
  const [cohortB, setCohortB] = useState(cohorts[1]?.id ?? '')
  const [traitId, setTraitId] = useState(traits[0]?.traitId ?? '')
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    if (!cohortA || !cohortB || !traitId || cohortA === cohortB) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(
        `/api/admin/assessments/${assessmentId}/analytics/cohorts?traitId=${traitId}&cohortA=${cohortA}&cohortB=${cohortB}`
      )
      const json = await res.json()
      if (!json.ok) {
        setError(json.error ?? 'comparison_failed')
      } else {
        setResult(json as ComparisonResult)
      }
    } catch {
      setError('network_error')
    } finally {
      setLoading(false)
    }
  }

  if (cohorts.length < 2) {
    return (
      <p className="text-sm text-[var(--site-text-muted)]">
        At least two cohorts are required for comparison.
      </p>
    )
  }

  if (traits.length === 0) {
    return (
      <p className="text-sm text-[var(--site-text-muted)]">
        No traits configured for this assessment.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--site-text-muted)] mb-1">
            Trait
          </label>
          <select
            value={traitId}
            onChange={(e) => setTraitId(e.target.value)}
            className="rounded border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-2 py-1.5 text-sm text-[var(--site-text-primary)]"
          >
            {traits.map((t) => (
              <option key={t.traitId} value={t.traitId}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--site-text-muted)] mb-1">
            Group A
          </label>
          <select
            value={cohortA}
            onChange={(e) => setCohortA(e.target.value)}
            className="rounded border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-2 py-1.5 text-sm text-[var(--site-text-primary)]"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--site-text-muted)] mb-1">
            Group B
          </label>
          <select
            value={cohortB}
            onChange={(e) => setCohortB(e.target.value)}
            className="rounded border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-2 py-1.5 text-sm text-[var(--site-text-primary)]"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={run}
          disabled={loading || cohortA === cohortB || !traitId}
          className="rounded bg-[var(--site-accent-strong)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Computing...' : 'Compare'}
        </button>
      </div>

      {cohortA === cohortB && (
        <p className="text-xs text-amber-600">Select two different cohorts to compare.</p>
      )}

      {error && (
        <p className="text-sm text-red-600">
          {error === 'insufficient_data_group_a' && 'Group A has fewer than 2 scored submissions.'}
          {error === 'insufficient_data_group_b' && 'Group B has fewer than 2 scored submissions.'}
          {error === 'trait_not_found' && 'Trait not found.'}
          {error === 'cohort_not_found' && 'One or more cohorts not found.'}
          {!['insufficient_data_group_a', 'insufficient_data_group_b', 'trait_not_found', 'cohort_not_found'].includes(error) && `Error: ${error}`}
        </p>
      )}

      {result && (
        <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--site-border)] flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--site-text-primary)]">
              {result.traitName}
            </span>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${EFFECT_COLORS[result.effectSizeLabel] ?? ''}`}>
              {result.effectSizeLabel} effect
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[var(--site-border)]">
            {[result.groupA, result.groupB].map((g) => (
              <div key={g.cohortName} className="px-4 py-3">
                <p className="text-xs font-medium text-[var(--site-text-muted)]">{g.cohortName}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--site-text-primary)]">
                  {g.mean.toFixed(2)}
                </p>
                <p className="text-xs text-[var(--site-text-muted)]">
                  SD {g.sd?.toFixed(2) ?? '—'} &nbsp;·&nbsp; n={g.n}
                </p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-[var(--site-border)] flex flex-wrap gap-4 text-xs text-[var(--site-text-muted)]">
            <span>
              mean diff {result.meanDiff > 0 ? '+' : ''}{result.meanDiff.toFixed(3)}
            </span>
            <span>
              95% CI [{result.ci95.lower.toFixed(3)}, {result.ci95.upper.toFixed(3)}]
            </span>
            <span>t = {result.t.toFixed(3)}</span>
            <span>df = {result.df.toFixed(1)}</span>
            <span>p = {result.pValue < 0.001 ? '<0.001' : result.pValue.toFixed(4)}</span>
            <span>d = {result.cohenD.toFixed(3)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
