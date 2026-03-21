'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FoundationButton } from '@/components/ui/foundation/button'
import { Badge } from '@/components/ui/badge'
import { ActionMenu } from '@/components/ui/action-menu'

type ValidationRun = {
  id: string
  norm_group_id: string | null
  analysis_type: 'efa' | 'cfa' | 'invariance' | 'full_validation'
  status: 'queued' | 'running' | 'completed' | 'failed' | 'approved' | 'superseded'
  grouping_variable: string | null
  sample_n: number
  minimum_sample_n: number | null
  summary: Record<string, unknown>
  warnings: Array<Record<string, unknown> | string>
  error_message: string | null
  created_at: string
  completed_at: string | null
  approved_at: string | null
}

type NormGroup = {
  id: string
  name: string
}

type Props = {
  assessmentId: string
  initialRuns: ValidationRun[]
  normGroups: NormGroup[]
}

type GroupingPreset = '' | 'campaign_id' | 'cohort_id' | 'role' | 'custom'

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function summaryFactorCount(summary: Record<string, unknown>) {
  const recommended = summary.recommended_factor_count
  return typeof recommended === 'number' ? recommended : null
}

function warningCount(run: ValidationRun) {
  return Array.isArray(run.warnings) ? run.warnings.length : 0
}

function statusBadgeVariant(status: ValidationRun['status']): string {
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

function statusLabel(status: ValidationRun['status']) {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'completed':
      return 'Ready to review'
    case 'failed':
      return 'Needs fixing'
    case 'running':
      return 'In progress'
    case 'queued':
      return 'Queued'
    default:
      return 'Superseded'
  }
}

export function ConstructValidationSection({ assessmentId, initialRuns, normGroups }: Props) {
  const [runs, setRuns] = useState(initialRuns)
  const [analysisType, setAnalysisType] = useState<'efa' | 'cfa' | 'invariance' | 'full_validation'>(
    'full_validation'
  )
  const [normGroupId, setNormGroupId] = useState('')
  const [groupingPreset, setGroupingPreset] = useState<GroupingPreset>('')
  const [customGroupingVariable, setCustomGroupingVariable] = useState('')
  const [minimumSampleN, setMinimumSampleN] = useState('150')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyRunId, setBusyRunId] = useState<string | null>(null)

  const latestRun = runs[0] ?? null
  const queueGroupingVariable =
    groupingPreset === 'custom'
      ? customGroupingVariable.trim() || null
      : groupingPreset || null

  const queueSummary = useMemo(() => {
    const parts = [
      analysisType === 'full_validation'
        ? 'full check'
        : analysisType === 'efa'
          ? 'explore structure'
          : analysisType === 'cfa'
            ? 'confirm current structure'
            : 'compare groups',
    ]
    if (queueGroupingVariable) parts.push(`split by ${queueGroupingVariable}`)
    if (normGroupId) {
      const group = normGroups.find((item) => item.id === normGroupId)
      if (group) parts.push(`against ${group.name}`)
    }
    parts.push(`minimum sample ${Number.parseInt(minimumSampleN, 10) || 150}`)
    return parts.join(' · ')
  }, [analysisType, minimumSampleN, normGroupId, normGroups, queueGroupingVariable])

  async function cancelRun(runId: string) {
    setBusyRunId(runId)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/validation/runs/${runId}/cancel`, {
        method: 'POST',
      })
      const body = await response.json()
      if (!body.ok) throw new Error(body.error ?? 'cancel_failed')
      await reloadRuns()
      toast.success('Model check cancelled.')
    } catch {
      toast.error('Could not cancel the model check.')
    } finally {
      setBusyRunId(null)
    }
  }

  async function deleteRun(runId: string) {
    setBusyRunId(runId)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/validation/runs/${runId}`, {
        method: 'DELETE',
      })
      const body = await response.json()
      if (!body.ok) throw new Error(body.error ?? 'delete_failed')
      setRuns((prev) => prev.filter((r) => r.id !== runId))
      toast.success('Model check deleted.')
    } catch {
      toast.error('Could not delete the model check.')
    } finally {
      setBusyRunId(null)
    }
  }

  async function reloadRuns() {
    const response = await fetch(`/api/admin/assessments/${assessmentId}/validation/runs`, {
      cache: 'no-store',
    })
    const body = await response.json()
    if (!body.ok) throw new Error(body.error ?? 'reload_failed')
    setRuns(body.runs ?? [])
  }

  async function queueRun() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/validation/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType,
          normGroupId: normGroupId || null,
          groupingVariable: queueGroupingVariable,
          minimumSampleN: Number.parseInt(minimumSampleN, 10) || 150,
        }),
      })
      const body = await response.json()
      if (!body.ok) throw new Error(body.error ?? 'queue_failed')
      await reloadRuns()
      toast.success('Model check queued.')
    } catch (queueError) {
      const message = queueError instanceof Error ? queueError.message : 'queue_failed'
      setError(message)
      toast.error('Could not queue the model check.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="psychometric-panel space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">
              Model check workflow
            </p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--admin-text-primary)]">
              Check whether the question model still holds
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">
              Run a saved check when you want evidence about whether the current question grouping still fits the data.
              This creates review material. It does not change scoring by itself in this phase.
            </p>
          </div>
          {latestRun && (
            <div className="psychometric-panel-soft min-w-[240px] space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">Latest check</span>
                <Badge variant={statusBadgeVariant(latestRun.status)}>
                  {statusLabel(latestRun.status)}
                </Badge>
              </div>
              <p className="text-sm font-semibold text-[var(--admin-text-primary)]">
                {latestRun.analysis_type === 'full_validation'
                  ? 'Full check'
                  : latestRun.analysis_type === 'efa'
                    ? 'Explore structure'
                    : latestRun.analysis_type === 'cfa'
                      ? 'Confirm current structure'
                      : 'Compare groups'}
              </p>
              <p className="text-xs text-[var(--admin-text-muted)]">
                created {formatDate(latestRun.created_at)}
                {latestRun.grouping_variable ? ` · ${latestRun.grouping_variable}` : ''}
              </p>
              <p className="text-xs text-[var(--admin-text-muted)]">
                sample n={latestRun.sample_n || 0}
                {summaryFactorCount(latestRun.summary) !== null
                  ? ` · factors ${summaryFactorCount(latestRun.summary)}`
                  : ''}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="psychometric-panel-soft">
            <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">What this is</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
              A saved evidence run that tests whether the assessment structure still behaves the way you expect.
            </p>
          </div>
          <div className="psychometric-panel-soft">
            <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">What changes</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
              You create a new review record and may later approve it as the current reference point.
            </p>
          </div>
          <div className="psychometric-panel-soft">
            <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">What stays the same</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
              Participant scoring does not change just because you run this check.
            </p>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr_1.1fr_1fr_0.9fr]">
          <div>
            <label className="backend-label">Check type</label>
            <select
              value={analysisType}
              onChange={(event) => setAnalysisType(event.target.value as typeof analysisType)}
              className="foundation-field mt-1"
            >
              <option value="full_validation">Full check</option>
              <option value="efa">Explore structure only</option>
              <option value="cfa">Confirm current structure only</option>
              <option value="invariance">Compare groups only</option>
            </select>
          </div>

          <div>
            <label className="backend-label">Reference group</label>
            <select
              value={normGroupId}
              onChange={(event) => setNormGroupId(event.target.value)}
              className="foundation-field mt-1"
            >
              <option value="">All submissions</option>
              {normGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="backend-label">Split by</label>
            <select
              value={groupingPreset}
              onChange={(event) => setGroupingPreset(event.target.value as GroupingPreset)}
              className="foundation-field mt-1"
            >
              <option value="">No group split</option>
              <option value="campaign_id">Campaign</option>
              <option value="cohort_id">Cohort</option>
              <option value="role">Role</option>
              <option value="custom">Custom demographics key</option>
            </select>
            {groupingPreset === 'custom' && (
              <input
                value={customGroupingVariable}
                onChange={(event) => setCustomGroupingVariable(event.target.value)}
                placeholder="demographics.region"
                className="foundation-field mt-2"
              />
            )}
          </div>

          <div>
            <label className="backend-label">Minimum sample</label>
            <input
              value={minimumSampleN}
              onChange={(event) => setMinimumSampleN(event.target.value)}
              inputMode="numeric"
              className="foundation-field mt-1"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--admin-border)] pt-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-[var(--admin-text-muted)]">{queueSummary}</p>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <FoundationButton variant="primary" size="sm" onClick={() => { void queueRun() }} disabled={loading}>
              {loading ? 'Queueing...' : 'Run model check'}
            </FoundationButton>
          </div>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="psychometric-panel-soft">
          <p className="text-sm text-[var(--admin-text-muted)]">
            No model checks yet. Run one when you want evidence about whether the current question structure still
            holds up in the data.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => {
            const factorCount = summaryFactorCount(run.summary)
            return (
              <div
                key={run.id}
                className="psychometric-panel flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
              >
                <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusBadgeVariant(run.status)}>
                      {statusLabel(run.status)}
                    </Badge>
                    {run.status === 'approved' && (
                      <Badge variant="signal-green">
                        Approved {formatDate(run.approved_at)}
                      </Badge>
                    )}
                    {warningCount(run) > 0 && (
                      <Badge variant="signal-amber">
                        {warningCount(run)} warning{warningCount(run) === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[var(--admin-text-primary)]">
                      {run.analysis_type === 'full_validation'
                        ? 'Full check'
                        : run.analysis_type === 'efa'
                          ? 'Explore structure'
                          : run.analysis_type === 'cfa'
                            ? 'Confirm current structure'
                            : 'Compare groups'}
                    </p>
                    <p className="text-sm text-[var(--admin-text-muted)]">
                      created {formatDate(run.created_at)}
                      {run.grouping_variable ? ` · split by ${run.grouping_variable}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-[var(--admin-text-muted)]">
                    <span>sample n={run.sample_n || 0}</span>
                    {factorCount !== null && <span>suggested factor count {factorCount}</span>}
                    {run.minimum_sample_n ? <span>minimum sample {run.minimum_sample_n}</span> : null}
                    {run.error_message ? <span className="text-red-600">{run.error_message}</span> : null}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 xl:items-end">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/assessments/${assessmentId}/psychometrics/validation/${run.id}`}
                      className="inline-flex items-center rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-alt)] transition-colors"
                    >
                      View run details
                    </Link>
                    {run.status === 'running' ? (
                      <FoundationButton
                        variant="secondary"
                        size="sm"
                        disabled={busyRunId === run.id}
                        onClick={() => { void cancelRun(run.id) }}
                      >
                        {busyRunId === run.id ? 'Cancelling...' : 'Cancel'}
                      </FoundationButton>
                    ) : run.status === 'approved' ? null : (
                      <ActionMenu
                        items={[
                          ...(run.status === 'queued'
                            ? [{ type: 'item' as const, label: 'Cancel', onSelect: () => { void cancelRun(run.id) }, disabled: busyRunId === run.id }]
                            : []),
                          { type: 'item' as const, label: 'Delete', onSelect: () => { void deleteRun(run.id) }, destructive: true, disabled: busyRunId === run.id },
                        ]}
                      />
                    )}
                  </div>
                  {run.warnings.length > 0 && (
                    <p className="max-w-sm text-right text-xs text-[var(--admin-text-muted)]">
                      {typeof run.warnings[0] === 'string'
                        ? run.warnings[0]
                        : String(run.warnings[0]?.message ?? run.warnings[0]?.code ?? 'warning')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
