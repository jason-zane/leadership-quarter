'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { FoundationButton } from '@/components/ui/foundation/button'
import { Badge } from '@/components/ui/badge'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type NormStat = {
  id: string
  norm_group_id: string
  trait_id: string
  mean: number
  sd: number
  computed_at: string
  assessment_traits: { code: string; name: string } | { code: string; name: string }[] | null
}

type NormGroup = {
  id: string
  assessment_id: string
  name: string
  description: string | null
  filters?: Record<string, unknown> | null
  n: number
  is_global: boolean
  created_at: string
  updated_at: string
  norm_stats: NormStat[]
}

type Campaign = {
  id: string
  name: string
  status: string | null
}

type Cohort = {
  id: string
  name: string
  status: string | null
}

type Props = {
  assessmentId: string
  initialNormGroups: NormGroup[]
  campaigns: Campaign[]
  cohorts: Cohort[]
}

type DemographicRow = {
  id: string
  key: string
  value: string
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nextRow() {
  return { id: crypto.randomUUID(), key: '', value: '' }
}

function parseListValue(value: string) {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts : parts[0] ?? ''
}

function statusBadgeVariant(group: NormGroup): string {
  if (group.n > 0 && group.norm_stats.length > 0) return 'signal-green'
  if (group.filters && Object.keys(group.filters).length > 0) return 'signal-blue'
  return 'signal-grey'
}

function describeFilters(
  filters: Record<string, unknown> | null | undefined,
  campaignNameById: Map<string, string>,
  cohortNameById: Map<string, string>
) {
  if (!filters || Object.keys(filters).length === 0) return ['All submissions']

  const labels: string[] = []

  if (Array.isArray(filters.campaign_ids)) {
    for (const value of filters.campaign_ids) {
      if (typeof value !== 'string') continue
      labels.push(`Campaign: ${campaignNameById.get(value) ?? value}`)
    }
  }

  if (Array.isArray(filters.cohort_ids)) {
    for (const value of filters.cohort_ids) {
      if (typeof value !== 'string') continue
      labels.push(`Cohort: ${cohortNameById.get(value) ?? value}`)
    }
  }

  if (typeof filters.created_at_from === 'string') {
    labels.push(`From ${formatDate(filters.created_at_from)}`)
  }

  if (typeof filters.created_at_to === 'string') {
    labels.push(`To ${formatDate(filters.created_at_to)}`)
  }

  if (filters.demographics && typeof filters.demographics === 'object') {
    for (const [key, rawValue] of Object.entries(filters.demographics as Record<string, unknown>)) {
      if (Array.isArray(rawValue)) {
        labels.push(`${key}: ${rawValue.join(', ')}`)
      } else if (typeof rawValue === 'string') {
        labels.push(`${key}: ${rawValue}`)
      }
    }
  }

  return labels.length > 0 ? labels : ['Advanced filters']
}

export function NormGroupsSection({ assessmentId, initialNormGroups, campaigns, cohorts }: Props) {
  const [groups, setGroups] = useState<NormGroup[]>(initialNormGroups)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newIsGlobal, setNewIsGlobal] = useState(true)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([])
  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>([])
  const [createdAtFrom, setCreatedAtFrom] = useState('')
  const [createdAtTo, setCreatedAtTo] = useState('')
  const [demographicRows, setDemographicRows] = useState<DemographicRow[]>([nextRow()])
  const [advancedJson, setAdvancedJson] = useState('{}')
  const [saving, setSaving] = useState(false)
  const [computing, setComputing] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const campaignNameById = useMemo(
    () => new Map(campaigns.map((campaign) => [campaign.id, campaign.name])),
    [campaigns]
  )
  const cohortNameById = useMemo(
    () => new Map(cohorts.map((cohort) => [cohort.id, cohort.name])),
    [cohorts]
  )

  function toggleSelection(current: string[], id: string) {
    return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
  }

  const buildFilters = useCallback(() => {
    const guidedFilters: Record<string, unknown> = {}

    if (!newIsGlobal && selectedCampaignIds.length > 0) guidedFilters.campaign_ids = selectedCampaignIds
    if (!newIsGlobal && selectedCohortIds.length > 0) guidedFilters.cohort_ids = selectedCohortIds
    if (!newIsGlobal && createdAtFrom) guidedFilters.created_at_from = createdAtFrom
    if (!newIsGlobal && createdAtTo) guidedFilters.created_at_to = createdAtTo

    const demographics = demographicRows.reduce<Record<string, string | string[]>>((acc, row) => {
      const key = row.key.trim()
      const value = row.value.trim()
      if (!key || !value) return acc
      const parsed = parseListValue(value)
      if (Array.isArray(parsed)) {
        acc[key] = parsed
      } else if (parsed) {
        acc[key] = parsed
      }
      return acc
    }, {})

    if (!newIsGlobal && Object.keys(demographics).length > 0) {
      guidedFilters.demographics = demographics
    }

    let advancedFilters: Record<string, unknown> = {}
    const raw = advancedJson.trim()
    if (raw && raw !== '{}') {
      try {
        const parsed = JSON.parse(raw) as unknown
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { filters: null, error: 'Advanced JSON must be an object.' }
        }
        advancedFilters = parsed as Record<string, unknown>
      } catch {
        return { filters: null, error: 'Advanced JSON is not valid.' }
      }
    }

    const combined = newIsGlobal ? advancedFilters : { ...guidedFilters, ...advancedFilters }
    return {
      filters: Object.keys(combined).length > 0 ? combined : null,
      error: null,
    }
  }, [
    advancedJson,
    createdAtFrom,
    createdAtTo,
    demographicRows,
    newIsGlobal,
    selectedCampaignIds,
    selectedCohortIds,
  ])

  useEffect(() => {
    if (!adding) return
    const compiled = buildFilters()
    if (compiled.error) {
      setPreviewCount(null)
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setPreviewing(true)
      try {
        const response = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters: compiled.filters }),
        })
        const body = await response.json()
        if (!body.ok) throw new Error(body.error ?? 'preview_failed')
        setPreviewCount(typeof body.count === 'number' ? body.count : null)
      } catch {
        setPreviewCount(null)
      } finally {
        setPreviewing(false)
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [adding, assessmentId, buildFilters])

  async function refreshGroups() {
    const listRes = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups`, { cache: 'no-store' })
    const listJson = await listRes.json()
    if (listJson.ok) setGroups(listJson.normGroups)
  }

  async function addGroup() {
    if (!newName.trim()) {
      setError('Name is required.')
      return
    }

    const compiled = buildFilters()
    if (compiled.error) {
      setError(compiled.error)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || null,
          isGlobal: newIsGlobal,
          filters: compiled.filters,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'create_failed')
      setGroups((prev) => [...prev, { ...json.normGroup, norm_stats: [] }])
      setNewName('')
      setNewDescription('')
      setNewIsGlobal(true)
      setSelectedCampaignIds([])
      setSelectedCohortIds([])
      setCreatedAtFrom('')
      setCreatedAtTo('')
      setDemographicRows([nextRow()])
      setAdvancedJson('{}')
      setPreviewCount(null)
      setAdding(false)
      toast.success('Reference group created.')
    } catch {
      setError('Could not create reference group.')
      toast.error('Could not create reference group.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteGroup(groupId: string) {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups/${groupId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'delete_failed')
      setGroups((prev) => prev.filter((group) => group.id !== groupId))
      setConfirmingDeleteId(null)
      toast.success('Reference group deleted.')
    } catch {
      toast.error('Could not delete reference group.')
    }
  }

  async function computeNorms(groupId: string) {
    setComputing(groupId)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups/${groupId}/compute`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'compute_failed')
      await refreshGroups()
      toast.success(
        `Computed ${json.traitsComputed} trait benchmark(s) and ${json.dimensionsComputed ?? 0} dimension benchmark(s).`
      )
    } catch {
      toast.error('Could not compute reference group.')
    } finally {
      setComputing(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="psychometric-panel space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">Reference groups</p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--admin-text-primary)]">
              Choose who this assessment is compared against
            </h3>
            <p className="max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">
              A reference group decides who participant scores are compared with when benchmarks such as percentiles are
              calculated. This changes the comparison population, not the raw answers.
            </p>
          </div>
          <FoundationButton variant="secondary" size="sm" onClick={() => setAdding((value) => !value)}>
            {adding ? 'Close builder' : '+ Add reference group'}
          </FoundationButton>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="psychometric-panel-soft">
            <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">What this is</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
              A saved comparison population used for benchmarks like percentiles.
            </p>
          </div>
          <div className="psychometric-panel-soft">
            <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">What changes</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
              Future benchmark values are recalculated for the people included in this group.
            </p>
          </div>
          <div className="psychometric-panel-soft">
            <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">What stays the same</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-muted)]">
              The original answers and the raw trait scores do not change.
            </p>
          </div>
        </div>

        {adding && (
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="space-y-4 rounded-[24px] border border-[var(--admin-border)] bg-white/72 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="backend-label">Name</label>
                  <input
                    className="foundation-field mt-1"
                    placeholder="e.g. APAC leadership comparison group"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="backend-label">Description</label>
                  <input
                    className="foundation-field mt-1"
                    placeholder="Optional context for analysts"
                    value={newDescription}
                    onChange={(event) => setNewDescription(event.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-[var(--admin-text-primary)]">
                <input
                  type="checkbox"
                  checked={newIsGlobal}
                  onChange={(event) => setNewIsGlobal(event.target.checked)}
                  className="accent-[var(--admin-accent)]"
                />
                Use everyone as the reference group
              </label>

              {!newIsGlobal && (
                <div className="space-y-4">
                  <div>
                    <label className="backend-label">Campaigns</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {campaigns.length === 0 ? (
                        <p className="text-sm text-[var(--admin-text-muted)]">No campaigns linked to this assessment.</p>
                      ) : (
                        campaigns.map((campaign) => {
                          const active = selectedCampaignIds.includes(campaign.id)
                          return (
                            <button
                              key={campaign.id}
                              type="button"
                              onClick={() => setSelectedCampaignIds((current) => toggleSelection(current, campaign.id))}
                              className={[
                                'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                                active
                                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                                  : 'bg-transparent border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:border-[var(--admin-border-strong)]',
                              ].join(' ')}
                            >
                              {campaign.name}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="backend-label">Cohorts</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cohorts.length === 0 ? (
                        <p className="text-sm text-[var(--admin-text-muted)]">No cohorts configured for this assessment.</p>
                      ) : (
                        cohorts.map((cohort) => {
                          const active = selectedCohortIds.includes(cohort.id)
                          return (
                            <button
                              key={cohort.id}
                              type="button"
                              onClick={() => setSelectedCohortIds((current) => toggleSelection(current, cohort.id))}
                              className={[
                                'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                                active
                                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                                  : 'bg-transparent border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:border-[var(--admin-border-strong)]',
                              ].join(' ')}
                            >
                              {cohort.name}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="backend-label">Created from</label>
                      <input
                        type="date"
                        className="foundation-field mt-1"
                        value={createdAtFrom}
                        onChange={(event) => setCreatedAtFrom(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="backend-label">Created to</label>
                      <input
                        type="date"
                        className="foundation-field mt-1"
                        value={createdAtTo}
                        onChange={(event) => setCreatedAtTo(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="backend-label">Demographics filters</label>
                      <FoundationButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setDemographicRows((current) => [...current, nextRow()])}
                      >
                        Add demographic
                      </FoundationButton>
                    </div>
                    {demographicRows.map((row, index) => (
                      <div key={row.id} className="grid gap-3 md:grid-cols-[0.9fr_1.2fr_auto]">
                        <input
                          className="foundation-field"
                          placeholder="region"
                          value={row.key}
                          onChange={(event) =>
                            setDemographicRows((current) =>
                              current.map((item) =>
                                item.id === row.id ? { ...item, key: event.target.value } : item
                              )
                            )
                          }
                        />
                        <input
                          className="foundation-field"
                          placeholder="apac or apac, emea"
                          value={row.value}
                          onChange={(event) =>
                            setDemographicRows((current) =>
                              current.map((item) =>
                                item.id === row.id ? { ...item, value: event.target.value } : item
                              )
                            )
                          }
                        />
                        <FoundationButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setDemographicRows((current) =>
                              current.length > 1 ? current.filter((item) => item.id !== row.id) : [nextRow()]
                            )
                          }
                        >
                          {index === 0 && demographicRows.length === 1 ? 'Reset' : 'Remove'}
                        </FoundationButton>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <details className="rounded-[20px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--admin-text-primary)]">
                  Advanced JSON fallback
                </summary>
                <div className="mt-3 space-y-2">
                  <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
                    Advanced JSON merges over the guided filters. Use it only when the structured builder does not cover
                    the case you need.
                  </p>
                  <textarea
                    className="foundation-field min-h-28 font-mono text-xs"
                    value={advancedJson}
                    onChange={(event) => setAdvancedJson(event.target.value)}
                  />
                </div>
              </details>
            </div>

            <div className="space-y-4 rounded-[24px] border border-[var(--admin-border)] bg-white/72 p-4">
              <div>
                <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">Preview</p>
                <h4 className="mt-2 text-lg font-semibold text-[var(--admin-text-primary)]">
                  Matching response group
                </h4>
              </div>
              <div className="psychometric-metric-card">
                <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">Current match</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[var(--admin-text-primary)]">
                  {previewing ? '…' : previewCount ?? 0}
                </p>
                <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                  {newIsGlobal
                    ? 'Using everyone means all available submissions are included unless advanced JSON narrows the pool.'
                    : 'The preview updates automatically as you refine who should be included.'}
                </p>
              </div>

              <div className="psychometric-panel-soft">
                <p className="font-eyebrow text-[11px] text-[var(--admin-text-soft)]">What happens when you compute</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--admin-text-muted)]">
                  <li>Campaign and cohort filters can include more than one option.</li>
                  <li>Comma-separated demographic values are treated as “match any of these”.</li>
                  <li>The system recalculates both trait and dimension benchmark values for this group.</li>
                </ul>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap gap-2">
                <FoundationButton variant="primary" size="sm" onClick={() => { void addGroup() }} disabled={saving}>
                  {saving ? 'Saving...' : 'Create reference group'}
                </FoundationButton>
                <FoundationButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setAdding(false)
                    setError(null)
                    setPreviewCount(null)
                  }}
                >
                  Cancel
                </FoundationButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="psychometric-panel-soft">
          <p className="text-sm text-[var(--admin-text-muted)]">
            No reference groups configured yet. Create one before computing benchmark values such as percentiles.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const latestStat = group.norm_stats[0] ?? null
            const computedAt = latestStat?.computed_at ?? null
            const filterLabels = describeFilters(group.filters, campaignNameById, cohortNameById)

            return (
              <div key={group.id} className="psychometric-panel space-y-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusBadgeVariant(group)}>
                        {group.is_global ? 'Everyone' : 'Filtered'}
                      </Badge>
                      <Badge variant="signal-grey">n={group.n}</Badge>
                      {computedAt && (
                        <Badge variant="signal-green">Computed {formatDate(computedAt)}</Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-[var(--admin-text-primary)]">{group.name}</p>
                      {group.description && (
                        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{group.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {filterLabels.map((label) => (
                        <Badge key={`${group.id}-${label}`} variant="signal-grey">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <FoundationButton
                      variant="primary"
                      size="sm"
                      onClick={() => { void computeNorms(group.id) }}
                      disabled={computing === group.id}
                    >
                      {computing === group.id ? 'Computing...' : 'Compute benchmarks'}
                    </FoundationButton>

                    {confirmingDeleteId === group.id ? (
                      <>
                        <FoundationButton
                          variant="danger"
                          size="sm"
                          onClick={() => { void deleteGroup(group.id) }}
                        >
                          Confirm delete
                        </FoundationButton>
                        <FoundationButton
                          variant="secondary"
                          size="sm"
                          onClick={() => setConfirmingDeleteId(null)}
                        >
                          Cancel
                        </FoundationButton>
                      </>
                    ) : (
                      <FoundationButton
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmingDeleteId(group.id)}
                      >
                        Delete
                      </FoundationButton>
                    )}
                  </div>
                </div>

                {group.norm_stats.length > 0 && (
                  <DashboardDataTableShell>
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em]">
                        <tr>
                          <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Trait</th>
                          <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Mean</th>
                          <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">SD</th>
                          <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">Computed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.norm_stats.map((stat) => {
                          const trait = pickOne(stat.assessment_traits)
                          return (
                            <tr key={stat.id} className="border-t border-[rgba(103,127,159,0.12)] hover:bg-[rgba(103,127,159,0.04)]">
                              <td className="px-4 py-3">
                                <div className="font-mono text-xs text-[var(--admin-text-primary)]">
                                  {trait?.code ?? stat.trait_id}
                                </div>
                                <div className="text-xs text-[var(--admin-text-muted)]">
                                  {trait?.name ?? 'Trait'}
                                </div>
                              </td>
                              <td className="px-4 py-3">{stat.mean.toFixed(2)}</td>
                              <td className="px-4 py-3">{stat.sd.toFixed(2)}</td>
                              <td className="px-4 py-3">{formatDate(stat.computed_at)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </DashboardDataTableShell>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
