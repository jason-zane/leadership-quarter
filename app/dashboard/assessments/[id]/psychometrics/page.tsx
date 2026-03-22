'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import type {
  PsychometricItemDiagnostic,
  PsychometricScaleDiagnostic,
  PsychometricStructure,
} from '@/utils/assessments/assessment-psychometric-structure'
import {
  createEmptyPsychometricsConfig,
  normalizePsychometricsConfig,
  type PsychometricValidationRun,
  type PsychometricsConfig,
} from '@/utils/assessments/assessment-psychometrics'
import {
  buildReferenceGroupDraft,
  buildReferenceGroupFilters,
  createEmptyReferenceGroupDraft,
  describeFilters,
  nextDemographicRow,
  toggleSelection,
  type ReferenceGroupFilterDraft,
} from './_lib/reference-group-helpers'
import {
  formatDateTime,
  signalPill,
} from './_lib/diagnostic-helpers'

type PsychometricsTab = 'measurement' | 'groups' | 'diagnostics' | 'validation'

type ReferenceOption = {
  id: string
  name: string
  status?: string | null
}

// DemographicRow and ReferenceGroupFilterDraft types are re-exported from ./_lib/reference-group-helpers

type WorkspaceResponse = {
  psychometricsConfig: unknown
  structure: PsychometricStructure
  diagnostics: {
    scaleDiagnostics: PsychometricScaleDiagnostic[]
    itemDiagnostics: PsychometricItemDiagnostic[]
  }
  summary: {
    totalResponses: number
    scaleCount: number
    itemCount: number
    reverseCodedCount: number
    warningCount: number
  }
}

// SectionCard and MetricCard remain local UI-only components

function SectionCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <FoundationSurface className="p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>
        </div>
        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </FoundationSurface>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <FoundationSurface className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{value}</p>
    </FoundationSurface>
  )
}

export default function AssessmentPsychometricsPage() {
  const params = useParams<{ id: string }>()
  const assessmentId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningValidation, setRunningValidation] = useState(false)
  const [activeTab, setActiveTab] = useState<PsychometricsTab>('measurement')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [psychometricsConfig, setPsychometricsConfig] = useState<PsychometricsConfig>(createEmptyPsychometricsConfig())
  const [structure, setStructure] = useState<PsychometricStructure>({ primaryScales: [], warnings: [], scalePoints: 5 })
  const [diagnostics, setDiagnostics] = useState<WorkspaceResponse['diagnostics']>({ scaleDiagnostics: [], itemDiagnostics: [] })
  const [summary, setSummary] = useState<WorkspaceResponse['summary']>({
    totalResponses: 0,
    scaleCount: 0,
    itemCount: 0,
    reverseCodedCount: 0,
    warningCount: 0,
  })
  const [campaignOptions, setCampaignOptions] = useState<ReferenceOption[]>([])
  const [cohortOptions, setCohortOptions] = useState<ReferenceOption[]>([])
  const [referenceGroupDrafts, setReferenceGroupDrafts] = useState<Record<string, ReferenceGroupFilterDraft>>({})
  const [referenceGroupErrors, setReferenceGroupErrors] = useState<Record<string, string | null>>({})
  const [validationInput, setValidationInput] = useState({
    analysisType: 'full_validation' as PsychometricValidationRun['analysisType'],
    normGroupId: '',
    groupingVariable: '',
    minimumSampleN: 150,
  })
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const unsavedSnapshot = useMemo(
    () => ({ psychometricsConfig, referenceGroupDrafts }),
    [psychometricsConfig, referenceGroupDrafts]
  )
  const { isDirty, markSaved } = useUnsavedChanges(unsavedSnapshot)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [workspaceResponse, campaignsResponse, cohortsResponse] = await Promise.all([
          fetch(`/api/admin/assessments/${assessmentId}/psychometrics`, { cache: 'no-store' }),
          fetch(`/api/admin/assessments/${assessmentId}/campaigns`, { cache: 'no-store' }),
          fetch(`/api/admin/assessments/${assessmentId}/cohorts`, { cache: 'no-store' }),
        ])

        const workspaceBody = (await workspaceResponse.json().catch(() => null)) as WorkspaceResponse | { ok?: boolean } | null
        const campaignsBody = (await campaignsResponse.json().catch(() => null)) as { campaigns?: ReferenceOption[] } | null
        const cohortsBody = (await cohortsResponse.json().catch(() => null)) as { cohorts?: ReferenceOption[] } | null

        if (!active) return
        if (!workspaceResponse.ok || !workspaceBody || !('psychometricsConfig' in workspaceBody)) {
          setError('Failed to load the V2 psychometrics workspace.')
          return
        }

        const normalized = normalizePsychometricsConfig(workspaceBody.psychometricsConfig)
        const nextReferenceGroupDrafts = Object.fromEntries(
          normalized.referenceGroups.map((group) => [group.id, buildReferenceGroupDraft(group.filters)])
        )

        setPsychometricsConfig(normalized)
        setStructure(workspaceBody.structure)
        setDiagnostics(workspaceBody.diagnostics)
        setSummary(workspaceBody.summary)
        setCampaignOptions(campaignsBody?.campaigns ?? [])
        setCohortOptions(cohortsBody?.cohorts ?? [])
        setReferenceGroupDrafts(nextReferenceGroupDrafts)
        setReferenceGroupErrors(Object.fromEntries(normalized.referenceGroups.map((group) => [group.id, null])))
        markSaved({ psychometricsConfig: normalized, referenceGroupDrafts: nextReferenceGroupDrafts })
        setSavedAt(null)
      } catch {
        if (active) setError('Failed to load the V2 psychometrics workspace.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [assessmentId, markSaved])

  const tabs = [
    { key: 'measurement' as const, label: 'Measurement' },
    { key: 'groups' as const, label: 'Reference groups' },
    { key: 'diagnostics' as const, label: 'Diagnostics' },
    { key: 'validation' as const, label: 'Validation' },
  ]

  const sortedRuns = useMemo(
    () => [...psychometricsConfig.validationRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [psychometricsConfig.validationRuns]
  )

  const itemDiagnosticsByScale = useMemo(() => {
    const groups = new Map<string, PsychometricItemDiagnostic[]>()
    for (const item of diagnostics.itemDiagnostics) {
      const current = groups.get(item.scaleKey) ?? []
      current.push(item)
      groups.set(item.scaleKey, current)
    }
    return groups
  }, [diagnostics.itemDiagnostics])

  function setConfig(updater: (current: PsychometricsConfig) => PsychometricsConfig) {
    setPsychometricsConfig((current) => normalizePsychometricsConfig(updater(current)))
    setMessage(null)
    setError(null)
  }

  function addReferenceGroup() {
    const id = crypto.randomUUID()
    setConfig((current) => ({
      ...current,
      referenceGroups: [
        ...current.referenceGroups,
        {
          id,
          key: `reference_group_${current.referenceGroups.length + 1}`,
          name: '',
          useEveryone: true,
          filters: {},
          matchedSubmissionCount: 0,
          lastComputedAt: null,
          traitStats: [],
        },
      ],
    }))
    setReferenceGroupDrafts((current) => ({ ...current, [id]: createEmptyReferenceGroupDraft() }))
    setReferenceGroupErrors((current) => ({ ...current, [id]: null }))
  }

  function updateReferenceGroup(id: string, patch: Partial<PsychometricsConfig['referenceGroups'][number]>) {
    setConfig((current) => ({
      ...current,
      referenceGroups: current.referenceGroups.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    }))
  }

  function updateReferenceGroupDraft(id: string, updater: (current: ReferenceGroupFilterDraft) => ReferenceGroupFilterDraft) {
    let nextDraft = createEmptyReferenceGroupDraft()

    setReferenceGroupDrafts((current) => {
      nextDraft = updater(current[id] ?? createEmptyReferenceGroupDraft())
      return { ...current, [id]: nextDraft }
    })

    const compiled = buildReferenceGroupFilters(nextDraft)
    setReferenceGroupErrors((current) => ({ ...current, [id]: compiled.error }))
    if (!compiled.error) {
      updateReferenceGroup(id, { filters: compiled.filters })
    }
  }

  function deleteReferenceGroup(id: string) {
    setConfig((current) => ({
      ...current,
      referenceGroups: current.referenceGroups.filter((group) => group.id !== id),
    }))
    setReferenceGroupDrafts((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setReferenceGroupErrors((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  async function save() {
    const activeDraftErrors = Object.values(referenceGroupErrors).filter(Boolean)
    if (activeDraftErrors.length > 0) {
      setError(activeDraftErrors[0] ?? 'Resolve the reference-group filter errors before saving.')
      return
    }

    setSaving(true)
    setMessage(null)
    setError(null)
    setSavedAt(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/psychometrics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ psychometricsConfig }),
      })
      const body = (await response.json().catch(() => null)) as { psychometricsConfig?: unknown; error?: string; message?: string } | null
      if (!response.ok) {
        setError(body?.message || (body?.error ? `Failed to save: ${body.error}` : 'Failed to save the V2 psychometrics setup.'))
        return
      }
      const normalized = normalizePsychometricsConfig(body?.psychometricsConfig)
      const nextReferenceGroupDrafts = Object.fromEntries(
        normalized.referenceGroups.map((group) => [group.id, buildReferenceGroupDraft(group.filters)])
      )
      setPsychometricsConfig(normalized)
      setReferenceGroupDrafts(nextReferenceGroupDrafts)
      setReferenceGroupErrors(Object.fromEntries(normalized.referenceGroups.map((group) => [group.id, null])))
      markSaved({ psychometricsConfig: normalized, referenceGroupDrafts: nextReferenceGroupDrafts })
      setSavedAt(new Date().toLocaleTimeString())
      setMessage('V2 psychometrics setup saved.')
    } catch {
      setError('Failed to save the V2 psychometrics setup.')
    } finally {
      setSaving(false)
    }
  }

  async function computeReferenceGroup(groupId: string) {
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/psychometrics/reference-groups/${groupId}/compute`, {
        method: 'POST',
      })
      const body = (await response.json().catch(() => null)) as { psychometricsConfig?: unknown; error?: string } | null
      if (!response.ok) {
        setError(body?.error ? `Failed to compute reference group: ${body.error}` : 'Failed to compute reference group.')
        return
      }
      const normalized = normalizePsychometricsConfig(body?.psychometricsConfig)
      const nextReferenceGroupDrafts = Object.fromEntries(
        normalized.referenceGroups.map((group) => [group.id, buildReferenceGroupDraft(group.filters)])
      )
      setPsychometricsConfig(normalized)
      setReferenceGroupDrafts(nextReferenceGroupDrafts)
      setReferenceGroupErrors(Object.fromEntries(normalized.referenceGroups.map((group) => [group.id, null])))
      markSaved({ psychometricsConfig: normalized, referenceGroupDrafts: nextReferenceGroupDrafts })
      setSavedAt(new Date().toLocaleTimeString())
      setMessage('Reference group computed.')
    } catch {
      setError('Failed to compute reference group.')
    }
  }

  async function runValidation() {
    setRunningValidation(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/psychometrics/validation-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisType: validationInput.analysisType,
          normGroupId: validationInput.normGroupId || null,
          groupingVariable: validationInput.groupingVariable || null,
          minimumSampleN: validationInput.minimumSampleN,
        }),
      })
      const body = (await response.json().catch(() => null)) as { psychometricsConfig?: unknown; error?: string; sampleN?: number } | null
      if (!response.ok) {
        if (body?.error === 'insufficient_sample') {
          setError(`Validation needs a larger sample. Current matched responses: ${body.sampleN ?? 0}.`)
          return
        }
        setError(body?.error ? `Validation failed: ${body.error}` : 'Validation failed.')
        return
      }
      const normalized = normalizePsychometricsConfig(body?.psychometricsConfig)
      const nextReferenceGroupDrafts = Object.fromEntries(
        normalized.referenceGroups.map((group) => [group.id, buildReferenceGroupDraft(group.filters)])
      )
      setPsychometricsConfig(normalized)
      setReferenceGroupDrafts(nextReferenceGroupDrafts)
      setReferenceGroupErrors(Object.fromEntries(normalized.referenceGroups.map((group) => [group.id, null])))
      markSaved({ psychometricsConfig: normalized, referenceGroupDrafts: nextReferenceGroupDrafts })
      setSavedAt(new Date().toLocaleTimeString())
      setMessage('Validation run completed.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Validation failed.')
    } finally {
      setRunningValidation(false)
    }
  }

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          eyebrow="Assessment workspace"
          title="Psychometrics"
          description="Loading the psychometrics workspace."
        />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title="Psychometrics"
        description="Use psychometrics as the statistical evidence layer for the assessment. Questions owns structure, scoring owns meaning, and psychometrics owns reliability, norms, and validation."
        actions={(
          <div className="flex flex-col items-end gap-2">
            <FoundationButton type="button" variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </FoundationButton>
            {isDirty ? <p className="text-xs font-medium text-amber-700">Unsaved changes</p> : null}
            {!isDirty && savedAt ? <p className="text-xs text-emerald-700">Saved at {savedAt}</p> : null}
          </div>
        )}
      />

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Responses" value={summary.totalResponses} />
        <MetricCard label="Scales" value={summary.scaleCount} />
        <MetricCard label="Items" value={summary.itemCount} />
        <MetricCard label="Reverse coded" value={summary.reverseCodedCount} />
        <MetricCard label="Warnings" value={summary.warningCount} />
      </div>

      <FoundationSurface className="p-4">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Psychometrics sections">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={['admin-toggle-chip', activeTab === tab.key ? 'admin-toggle-chip-active' : ''].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </FoundationSurface>

      {activeTab === 'measurement' && (
        <div className="space-y-4">
          <SectionCard
            title="Measurement model"
            description="This is the read-only definition of what psychometrics is analysing. It confirms which scales exist, which items feed them, and whether the structure is sound enough to test."
          >
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Primary units</p>
                <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Traits are treated as the core psychometric scales in this workspace.</p>
              </div>
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Pulled from Questions</p>
                <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Items, reverse coding, and trait membership are inherited from the authored question bank.</p>
              </div>
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">What to check</p>
                <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Use this page to catch weak structures early before reliability, norms, or validation runs.</p>
              </div>
            </div>

            {structure.primaryScales.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No trait scales are available yet. Add traits and scored items in Questions first.</p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {structure.primaryScales.map((scale) => (
                  <div key={scale.key} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{scale.label}</p>
                        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                          {scale.itemCount} item{scale.itemCount === 1 ? '' : 's'} • {structure.scalePoints}-point response scale
                        </p>
                      </div>
                      {scale.competencyKeys.length > 0 ? (
                        <span className="rounded-full border border-[var(--admin-border)] px-3 py-1 text-xs text-[var(--admin-text-muted)]">
                          {scale.competencyKeys.length} linked competenc{scale.competencyKeys.length === 1 ? 'y' : 'ies'}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {scale.items.map((item) => (
                        <span key={item.questionKey} className="rounded-full border border-[var(--admin-border)] px-3 py-1 text-xs text-[var(--admin-text-primary)]">
                          {item.questionKey}{item.reverseScored ? ' • reverse' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Structural warnings"
            description="These are model-level warnings inferred from the V2 structure before any statistical evidence is calculated."
          >
            {structure.warnings.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No structural warnings right now.</p>
            ) : (
              <div className="space-y-3">
                {structure.warnings.map((warning, index) => (
                  <div key={`${warning.code}-${index}`} className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {warning.message}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === 'groups' && (
        <SectionCard
          title="Reference groups"
          description="Create saved benchmark audiences using campaigns, cohorts, dates, and demographics. For client-level benchmarking later, the cleanest model is usually campaign segmentation rather than another parallel filter type."
          footer={<FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addReferenceGroup}>Add reference group</FoundationButton>}
        >
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Use this for</p>
              <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Comparing a respondent against a saved population without changing the raw score itself.</p>
            </div>
            <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Best selectors</p>
              <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Campaigns, cohorts, and date ranges keep the model easy to understand and easy to trust.</p>
            </div>
            <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Advanced fallback</p>
              <p className="mt-2 text-sm text-[var(--admin-text-primary)]">JSON still exists, but only as a fallback when the guided builder does not cover a special case.</p>
            </div>
          </div>

          {psychometricsConfig.referenceGroups.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No reference groups yet.</p>
          ) : psychometricsConfig.referenceGroups.map((group) => {
            const draft = referenceGroupDrafts[group.id] ?? createEmptyReferenceGroupDraft()
            const filterLabels = describeFilters(group.filters, campaignOptions, cohortOptions)

            return (
              <div key={group.id} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <span className="font-mono text-xs text-[var(--admin-text-muted)]">{group.key}</span>
                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Name</span>
                        <input
                          value={group.name}
                          onChange={(event) => updateReferenceGroup(group.id, { name: event.target.value })}
                          className="foundation-field w-full"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Key</span>
                        <input
                          value={group.key}
                          onChange={(event) => updateReferenceGroup(group.id, { key: event.target.value })}
                          className="foundation-field w-full"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <FoundationButton type="button" variant="secondary" size="sm" onClick={() => void computeReferenceGroup(group.id)}>
                      Compute group
                    </FoundationButton>
                    <FoundationButton type="button" variant="secondary" size="sm" onClick={() => deleteReferenceGroup(group.id)}>
                      Delete
                    </FoundationButton>
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-3 rounded-[18px] border border-[var(--admin-border)] bg-white/60 px-4 py-3 text-sm text-[var(--admin-text-primary)]">
                  <input
                    type="checkbox"
                    checked={group.useEveryone}
                    onChange={(event) => {
                      const checked = event.target.checked
                      updateReferenceGroup(group.id, { useEveryone: checked, filters: checked ? {} : buildReferenceGroupFilters(draft).filters })
                    }}
                  />
                  Use everyone in this assessment as the benchmark group
                </label>

                {!group.useEveryone ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-[18px] border border-[var(--admin-border)] bg-white/60 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Campaigns</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {campaignOptions.length === 0 ? (
                            <p className="text-sm text-[var(--admin-text-muted)]">No campaigns linked to this assessment.</p>
                          ) : (
                            campaignOptions.map((campaign) => {
                              const active = draft.campaignIds.includes(campaign.id)
                              return (
                                <button
                                  key={campaign.id}
                                  type="button"
                                  onClick={() => updateReferenceGroupDraft(group.id, (current) => ({
                                    ...current,
                                    campaignIds: toggleSelection(current.campaignIds, campaign.id),
                                  }))}
                                  className={[
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    active
                                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                                      : 'border-[var(--admin-border)] bg-transparent text-[var(--admin-text-muted)] hover:border-[var(--admin-border-strong)]',
                                  ].join(' ')}
                                >
                                  {campaign.name}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-[var(--admin-border)] bg-white/60 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Cohorts</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {cohortOptions.length === 0 ? (
                            <p className="text-sm text-[var(--admin-text-muted)]">No cohorts configured for this assessment.</p>
                          ) : (
                            cohortOptions.map((cohort) => {
                              const active = draft.cohortIds.includes(cohort.id)
                              return (
                                <button
                                  key={cohort.id}
                                  type="button"
                                  onClick={() => updateReferenceGroupDraft(group.id, (current) => ({
                                    ...current,
                                    cohortIds: toggleSelection(current.cohortIds, cohort.id),
                                  }))}
                                  className={[
                                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                    active
                                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                                      : 'border-[var(--admin-border)] bg-transparent text-[var(--admin-text-muted)] hover:border-[var(--admin-border-strong)]',
                                  ].join(' ')}
                                >
                                  {cohort.name}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Created from</span>
                        <input
                          type="date"
                          value={draft.createdAtFrom}
                          onChange={(event) => updateReferenceGroupDraft(group.id, (current) => ({ ...current, createdAtFrom: event.target.value }))}
                          className="foundation-field w-full"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Created to</span>
                        <input
                          type="date"
                          value={draft.createdAtTo}
                          onChange={(event) => updateReferenceGroupDraft(group.id, (current) => ({ ...current, createdAtTo: event.target.value }))}
                          className="foundation-field w-full"
                        />
                      </label>
                    </div>

                    <div className="rounded-[18px] border border-[var(--admin-border)] bg-white/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Demographic filters</p>
                        <FoundationButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => updateReferenceGroupDraft(group.id, (current) => ({
                            ...current,
                            demographicRows: [...current.demographicRows, nextDemographicRow()],
                          }))}
                        >
                          Add demographic
                        </FoundationButton>
                      </div>
                      <div className="mt-3 space-y-3">
                        {draft.demographicRows.map((row, index) => (
                          <div key={row.id} className="grid gap-3 md:grid-cols-[0.9fr_1.2fr_auto]">
                            <input
                              className="foundation-field"
                              placeholder="region"
                              value={row.key}
                              onChange={(event) => updateReferenceGroupDraft(group.id, (current) => ({
                                ...current,
                                demographicRows: current.demographicRows.map((item) =>
                                  item.id === row.id ? { ...item, key: event.target.value } : item
                                ),
                              }))}
                            />
                            <input
                              className="foundation-field"
                              placeholder="apac or apac, emea"
                              value={row.value}
                              onChange={(event) => updateReferenceGroupDraft(group.id, (current) => ({
                                ...current,
                                demographicRows: current.demographicRows.map((item) =>
                                  item.id === row.id ? { ...item, value: event.target.value } : item
                                ),
                              }))}
                            />
                            <FoundationButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => updateReferenceGroupDraft(group.id, (current) => ({
                                ...current,
                                demographicRows: current.demographicRows.length > 1
                                  ? current.demographicRows.filter((item) => item.id !== row.id)
                                  : [nextDemographicRow()],
                              }))}
                            >
                              {index === 0 && draft.demographicRows.length === 1 ? 'Reset' : 'Remove'}
                            </FoundationButton>
                          </div>
                        ))}
                      </div>
                    </div>

                    <details className="rounded-[18px] border border-dashed border-[var(--admin-border)] bg-white/40 px-4 py-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[var(--admin-text-primary)]">
                        Advanced JSON fallback
                      </summary>
                      <div className="mt-3 space-y-2">
                        <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
                          Use this only when the guided builder does not cover the audience definition you need.
                        </p>
                        <textarea
                          value={draft.advancedJson}
                          onChange={(event) => updateReferenceGroupDraft(group.id, (current) => ({ ...current, advancedJson: event.target.value }))}
                          className="foundation-field min-h-28 w-full font-mono text-xs"
                        />
                      </div>
                    </details>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {filterLabels.map((label) => (
                    <span key={`${group.id}-${label}`} className="rounded-full border border-[var(--admin-border)] bg-white/60 px-3 py-1 text-xs text-[var(--admin-text-muted)]">
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--admin-text-muted)]">
                  <span>Matched n = {group.matchedSubmissionCount}</span>
                  <span>Last computed {formatDateTime(group.lastComputedAt)}</span>
                  <span>{group.traitStats.length} trait stat{group.traitStats.length === 1 ? '' : 's'}</span>
                </div>

                {referenceGroupErrors[group.id] ? (
                  <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {referenceGroupErrors[group.id]}
                  </div>
                ) : null}
              </div>
            )
          })}
        </SectionCard>
      )}

      {activeTab === 'diagnostics' && (
        <SectionCard
          title="Diagnostics by trait"
          description="Each trait keeps its own reliability summary and item drill-down, so you can review item quality in the context of the scale it belongs to."
        >
          {diagnostics.scaleDiagnostics.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No diagnostics yet. You need response data before these values become meaningful.</p>
          ) : (
            <div className="space-y-4">
              {diagnostics.scaleDiagnostics.map((scale) => {
                const items = itemDiagnosticsByScale.get(scale.scaleKey) ?? []

                return (
                  <div key={scale.scaleKey} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{scale.scaleLabel}</p>
                        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                          {scale.itemCount} items • n = {scale.n}
                        </p>
                      </div>
                      <span className={signalPill(scale.signal)}>
                        {scale.signal === 'green' ? 'Stable' : scale.signal === 'amber' ? 'Watch' : scale.signal === 'red' ? 'Review' : 'Insufficient data'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      <div className="rounded-[16px] border border-[var(--admin-border)] bg-white/60 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">Alpha</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{scale.alpha?.toFixed(3) ?? '—'}</p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--admin-border)] bg-white/60 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">SEM</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{scale.sem?.toFixed(3) ?? '—'}</p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--admin-border)] bg-white/60 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">CI lower</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{scale.alphaCI95?.lower?.toFixed(3) ?? '—'}</p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--admin-border)] bg-white/60 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">CI upper</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{scale.alphaCI95?.upper?.toFixed(3) ?? '—'}</p>
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-[16px] border border-[var(--admin-border)] bg-white/60">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--admin-border)] text-left text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Mean</th>
                            <th className="px-3 py-2">CITC</th>
                            <th className="px-3 py-2">Discrimination</th>
                            <th className="px-3 py-2">Alpha if removed</th>
                            <th className="px-3 py-2">Missing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-3 py-4 text-sm text-[var(--admin-text-muted)]">
                                No item diagnostics available for this trait yet.
                              </td>
                            </tr>
                          ) : items.map((item) => (
                            <tr key={item.questionKey} className="border-b border-[var(--admin-border)] last:border-b-0">
                              <td className="px-3 py-3 text-[var(--admin-text-primary)]">
                                <div>{item.text || item.questionKey}</div>
                                <div className="text-xs text-[var(--admin-text-muted)]">{item.questionKey}{item.reverseScored ? ' • reverse' : ''}</div>
                              </td>
                              <td className="px-3 py-3">{item.mean.toFixed(2)}</td>
                              <td className="px-3 py-3">{item.citc?.toFixed(3) ?? '—'}</td>
                              <td className="px-3 py-3">{item.discriminationIndex?.toFixed(3) ?? '—'}</td>
                              <td className="px-3 py-3">{item.alphaIfDeleted?.toFixed(3) ?? '—'}</td>
                              <td className="px-3 py-3">{(item.missingPct * 100).toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === 'validation' && (
        <div className="space-y-4">
          <SectionCard
            title="Run validation"
            description="Full validation stays available in V2, but the workflow is reduced to one compact run form plus a readable history."
            footer={(
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={() => void runValidation()} disabled={runningValidation}>
                {runningValidation ? 'Running...' : 'Run validation'}
              </FoundationButton>
            )}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Analysis type</span>
                <select
                  value={validationInput.analysisType}
                  onChange={(event) => setValidationInput((current) => ({ ...current, analysisType: event.target.value as PsychometricValidationRun['analysisType'] }))}
                  className="foundation-field w-full"
                >
                  <option value="full_validation">Full validation</option>
                  <option value="efa">EFA</option>
                  <option value="cfa">CFA</option>
                  <option value="invariance">Invariance</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Reference group</span>
                <select
                  value={validationInput.normGroupId}
                  onChange={(event) => setValidationInput((current) => ({ ...current, normGroupId: event.target.value }))}
                  className="foundation-field w-full"
                >
                  <option value="">All responses</option>
                  {psychometricsConfig.referenceGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name || group.key}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Grouping variable</span>
                <select
                  value={validationInput.groupingVariable}
                  onChange={(event) => setValidationInput((current) => ({ ...current, groupingVariable: event.target.value }))}
                  className="foundation-field w-full"
                >
                  <option value="">None</option>
                  <option value="campaign_id">Campaign</option>
                  <option value="role">Role</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Minimum sample</span>
                <input
                  type="number"
                  min="25"
                  value={validationInput.minimumSampleN}
                  onChange={(event) => setValidationInput((current) => ({ ...current, minimumSampleN: Number(event.target.value) }))}
                  className="foundation-field w-full"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Validation history"
            description="Keep the run history readable: what was run, on what sample, and what the top findings were."
          >
            {sortedRuns.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No validation runs yet.</p>
            ) : (
              <div className="space-y-3">
                {sortedRuns.map((run) => (
                  <div key={run.id} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[var(--admin-text-primary)]">
                          {run.analysisType.replace('_', ' ')} • n = {run.sampleN}
                        </p>
                        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                          {run.normGroupId ? `Reference group ${run.normGroupId}` : 'All responses'} • {formatDateTime(run.completedAt ?? run.createdAt)}
                        </p>
                      </div>
                      <span className={run.status === 'completed' ? 'rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-800' : 'rounded-full bg-red-100 px-2.5 py-1 text-xs text-red-700'}>
                        {run.status === 'completed' ? 'Completed' : 'Failed'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-[16px] border border-[var(--admin-border)] bg-white/60 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">Warnings</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{run.warnings.length}</p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--admin-border)] bg-white/60 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">Scale diagnostics</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{run.scaleDiagnostics.length}</p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--admin-border)] bg-white/60 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">Item diagnostics</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{run.itemDiagnostics.length}</p>
                      </div>
                      <div className="rounded-[16px] border border-[var(--admin-border)] bg-white/60 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[var(--admin-text-soft)]">Factor models</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{run.factorModels.length}</p>
                      </div>
                    </div>

                    {run.warnings.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {run.warnings.slice(0, 3).map((warning, index) => (
                          <div key={index} className="rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                            {warning}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </DashboardPageShell>
  )
}
