'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type ReportDefinitionItem = {
  id: string
  key: string
  name: string
  description: string | null
  compatibility?: {
    compatible: boolean
    reason: string
  }
}

type ScoringModelItem = {
  id: string
  model_key: string
  name: string
  mode: 'rule_based' | 'psychometric' | 'hybrid'
  status: 'draft' | 'published' | 'archived'
  is_default: boolean
  output_summary?: {
    competency_count?: number
    classification_count?: number
    uses_matrix?: boolean
    scale_points?: number
  } | null
}

type ReportVariantItem = {
  id: string
  report_definition_id: string
  variant_key: string
  name: string
  version: number
  status: 'draft' | 'published' | 'archived'
  is_default: boolean
  scoring_model_id?: string | null
  report_config: unknown
  compatibility_snapshot?: {
    compatible?: boolean
    reason?: string
  } | null
}

type LoadPayload = {
  ok?: boolean
  definitions?: ReportDefinitionItem[]
  scoringModels?: ScoringModelItem[]
  variants?: ReportVariantItem[]
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function parseJson(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return {}
  return JSON.parse(trimmed) as unknown
}

function modeLabel(value: ScoringModelItem['mode']) {
  switch (value) {
    case 'psychometric':
      return 'Psychometric'
    case 'hybrid':
      return 'Hybrid'
    default:
      return 'Rule-based'
  }
}

function variantReadinessLabel(variant: ReportVariantItem) {
  if (variant.compatibility_snapshot?.compatible === false) {
    return 'Blocked'
  }
  if (variant.status === 'published') {
    return 'Ready'
  }
  if (variant.status === 'archived') {
    return 'Archived'
  }
  return 'Draft'
}

export function ReportVariantsManager({ assessmentId }: { assessmentId: string }) {
  const [definitions, setDefinitions] = useState<ReportDefinitionItem[]>([])
  const [scoringModels, setScoringModels] = useState<ScoringModelItem[]>([])
  const [variants, setVariants] = useState<ReportVariantItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDraft, setCreateDraft] = useState({
    definitionKey: '',
    scoringModelId: '',
    name: '',
    variantKey: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    isDefault: false,
  })
  const [variantDrafts, setVariantDrafts] = useState<Record<string, {
    name: string
    status: ReportVariantItem['status']
    isDefault: boolean
    scoringModelId: string
    reportConfigJson: string
  }>>({})
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null)
  const [savedVariantId, setSavedVariantId] = useState<string | null>(null)

  const scoringModelNameById = useMemo(
    () => new Map(scoringModels.map((model) => [model.id, model.name])),
    [scoringModels]
  )
  const definitionById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions]
  )
  const usageCountByModelId = useMemo(
    () =>
      variants.reduce<Record<string, number>>((counts, variant) => {
        const key = variant.scoring_model_id ?? ''
        if (!key) return counts
        counts[key] = (counts[key] ?? 0) + 1
        return counts
      }, {}),
    [variants]
  )
  const publishedVariantCount = useMemo(
    () => variants.filter((variant) => variant.status === 'published').length,
    [variants]
  )
  const activeScoringModels = useMemo(
    () => scoringModels.filter((model) => model.status !== 'archived'),
    [scoringModels]
  )
  const compatibleDefinitions = useMemo(
    () => definitions.filter((definition) => definition.compatibility?.compatible),
    [definitions]
  )
  const canCreateVariant = activeScoringModels.length > 0 && compatibleDefinitions.length > 0

  async function load() {
    setLoading(true)
    setError(null)

    const response = await fetch(`/api/admin/assessments/${assessmentId}/report-variants`, {
      cache: 'no-store',
    })
    const body = (await response.json().catch(() => null)) as LoadPayload | null

    if (!response.ok || !body?.ok) {
      setError('Failed to load report variants.')
      setLoading(false)
      return
    }

    const nextDefinitions = body.definitions ?? []
    const nextScoringModels = body.scoringModels ?? []
    const nextVariants = body.variants ?? []
    const defaultScoringModelId = nextScoringModels.find((model) => model.is_default)?.id ?? nextScoringModels[0]?.id ?? ''

    setDefinitions(nextDefinitions)
    setScoringModels(nextScoringModels)
    setVariants(nextVariants)
    setCreateDraft((current) => ({
      ...current,
      scoringModelId: current.scoringModelId || defaultScoringModelId,
    }))
    setVariantDrafts(
      Object.fromEntries(
        nextVariants.map((variant) => [
          variant.id,
          {
            name: variant.name,
            status: variant.status,
            isDefault: variant.is_default,
            scoringModelId: variant.scoring_model_id ?? defaultScoringModelId,
            reportConfigJson: stringifyJson(variant.report_config),
          },
        ])
      )
    )
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [assessmentId])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setBusyVariantId('create')
    setSavedVariantId(null)
    setError(null)

    const response = await fetch(`/api/admin/assessments/${assessmentId}/report-variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createDraft),
    })
    const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null

    if (!response.ok || !body?.ok) {
      setError(body?.message ?? 'Could not create report variant.')
      setBusyVariantId(null)
      return
    }

    setCreateDraft((current) => ({
      ...current,
      name: '',
      variantKey: '',
      status: 'draft',
      isDefault: false,
    }))
    await load()
    setBusyVariantId(null)
  }

  async function handleSaveVariant(variant: ReportVariantItem) {
    const draft = variantDrafts[variant.id]
    if (!draft) return

    setBusyVariantId(variant.id)
    setSavedVariantId(null)
    setError(null)

    let reportConfig: unknown

    try {
      reportConfig = parseJson(draft.reportConfigJson)
    } catch {
      setError('Variant report config JSON is invalid.')
      setBusyVariantId(null)
      return
    }

    const response = await fetch(`/api/admin/assessments/${assessmentId}/report-variants/${variant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: draft.name,
        status: draft.status,
        isDefault: draft.isDefault,
        scoringModelId: draft.scoringModelId,
        reportConfig,
      }),
    })
    const body = (await response.json().catch(() => null)) as { ok?: boolean } | null

    if (!response.ok || !body?.ok) {
      setError('Could not save report variant.')
      setBusyVariantId(null)
      return
    }

    setSavedVariantId(variant.id)
    await load()
    setBusyVariantId(null)
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Report variants</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Reports now sit on top of scoring models. Choose a scoring model first, then decide how that model should be presented and delivered.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Published variants</p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{publishedVariantCount}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Assessment default</p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {variants.find((variant) => variant.is_default)?.name ?? 'Not set'}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Best workflow</p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Publish the shared default first, then add internal-only variants</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {scoringModels.map((model) => (
          <div key={model.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{model.name}</p>
              {model.is_default ? (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Default
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {modeLabel(model.mode)} • {model.status}
            </p>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {model.output_summary?.competency_count ?? 0} competencies • {model.output_summary?.classification_count ?? 0} classifications
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Used by {usageCountByModelId[model.id] ?? 0} report variant{usageCountByModelId[model.id] === 1 ? '' : 's'}
            </p>
          </div>
        ))}
      </div>

      {activeScoringModels.length === 0 ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
          No active scoring models are available yet. Create or publish a scoring model first in{' '}
          <Link href={`/dashboard/assessments/${assessmentId}/scoring`} className="font-medium underline underline-offset-2">
            Scoring
          </Link>
          .
        </div>
      ) : null}
      {activeScoringModels.length > 0 && compatibleDefinitions.length === 0 ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-200">
          Report definitions are loaded, but none are compatible with the current assessment setup yet. Check the compatibility reasons below, then finish the required scoring or psychometric setup.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {definitions.map((definition) => (
          <div key={definition.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{definition.name}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{definition.description ?? definition.key}</p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                  definition.compatibility?.compatible
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}
              >
                {definition.compatibility?.compatible ? 'Compatible' : 'Blocked'}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {definition.compatibility?.reason ?? 'Compatibility not evaluated.'}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className="mt-6 space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Create variant</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Start with a published default report for candidates, then add specialist or internal-only variants as needed.
        </p>
        {!canCreateVariant ? (
          <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            This form unlocks once the assessment has at least one active scoring model and one compatible report definition.
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Definition</span>
            <select
              value={createDraft.definitionKey}
              onChange={(event) => setCreateDraft((current) => ({ ...current, definitionKey: event.target.value }))}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              required
            >
              <option value="">Select a report definition...</option>
              {definitions
                .filter((definition) => definition.compatibility?.compatible)
                .map((definition) => (
                  <option key={definition.id} value={definition.key}>{definition.name}</option>
                ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Scoring model</span>
            <select
              value={createDraft.scoringModelId}
              onChange={(event) => setCreateDraft((current) => ({ ...current, scoringModelId: event.target.value }))}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              required
            >
              <option value="">Select a scoring model...</option>
              {scoringModels
                .filter((model) => model.status !== 'archived')
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({modeLabel(model.mode)}{model.is_default ? ', default' : ''})
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Name</span>
            <input
              value={createDraft.name}
              onChange={(event) => setCreateDraft((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Leadership profile report"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Variant key</span>
            <input
              value={createDraft.variantKey}
              onChange={(event) => setCreateDraft((current) => ({ ...current, variantKey: event.target.value }))}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Optional slug"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Status</span>
            <select
              value={createDraft.status}
              onChange={(event) => setCreateDraft((current) => ({ ...current, status: event.target.value as 'draft' | 'published' | 'archived' }))}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={createDraft.isDefault}
            onChange={(event) => setCreateDraft((current) => ({ ...current, isDefault: event.target.checked }))}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          Set as assessment default when published
        </label>
        <button
          type="submit"
          disabled={busyVariantId === 'create' || !canCreateVariant}
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busyVariantId === 'create' ? 'Creating...' : 'Create report variant'}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Existing variants</h3>
        {loading ? <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading report variants...</p> : null}
        {!loading && variants.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No variants created yet. Publish a shared default first, then add internal-only or specialist variants if needed.
          </p>
        ) : null}
        {variants.map((variant) => {
          const draft = variantDrafts[variant.id]
          if (!draft) return null
          const definition = definitionById.get(variant.report_definition_id)
          const readinessLabel = variantReadinessLabel(variant)
          const readinessClassName = readinessLabel === 'Ready'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : readinessLabel === 'Blocked'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'

          return (
            <div key={variant.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{variant.name}</p>
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {variant.variant_key}
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  v{variant.version}
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {scoringModelNameById.get(draft.scoringModelId) ?? 'No scoring model'}
                </span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${readinessClassName}`}>
                  {readinessLabel}
                </span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Template</p>
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{definition?.name ?? 'Report'}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Audience use</p>
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{variant.is_default ? 'Candidate-facing default candidate' : 'Internal or optional'}</p>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Readiness</p>
                  <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                    {variant.compatibility_snapshot?.reason ?? 'No compatibility warning.'}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">Name</span>
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setVariantDrafts((current) => ({
                        ...current,
                        [variant.id]: {
                          ...draft,
                          name: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">Status</span>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setVariantDrafts((current) => ({
                        ...current,
                        [variant.id]: {
                          ...draft,
                          status: event.target.value as ReportVariantItem['status'],
                        },
                      }))
                    }
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">Scoring model</span>
                  <select
                    value={draft.scoringModelId}
                    onChange={(event) =>
                      setVariantDrafts((current) => ({
                        ...current,
                        [variant.id]: {
                          ...draft,
                          scoringModelId: event.target.value,
                        },
                      }))
                    }
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {scoringModels
                      .filter((model) => model.status !== 'archived')
                      .map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({modeLabel(model.mode)}{model.is_default ? ', default' : ''})
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <details className="mt-3 rounded-lg border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700">
                <summary className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Advanced variant config
                </summary>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Only use this if the shared report settings are not enough for this specific variant.
                </p>
                <label className="mt-3 block space-y-1 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300">Report config JSON</span>
                  <textarea
                    value={draft.reportConfigJson}
                    onChange={(event) =>
                      setVariantDrafts((current) => ({
                        ...current,
                        [variant.id]: {
                          ...draft,
                          reportConfigJson: event.target.value,
                        },
                      }))
                    }
                    rows={10}
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
              </details>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={draft.isDefault}
                    onChange={(event) =>
                      setVariantDrafts((current) => ({
                        ...current,
                        [variant.id]: {
                          ...draft,
                          isDefault: event.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  />
                  Set as assessment default
                </label>
                <button
                  type="button"
                  onClick={() => void handleSaveVariant(variant)}
                  disabled={busyVariantId === variant.id}
                  className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {busyVariantId === variant.id ? 'Saving...' : 'Save variant'}
                </button>
                {savedVariantId === variant.id ? (
                  <span className="text-xs text-emerald-600">Saved</span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </section>
  )
}
