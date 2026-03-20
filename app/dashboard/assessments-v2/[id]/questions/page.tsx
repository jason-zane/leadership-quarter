'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useParams } from 'next/navigation'
import { useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  buildV2QuestionBankCsvTemplate,
  createEmptyLayerContent,
  createEmptyV2QuestionBank,
  makeUniqueKey,
  normalizeV2QuestionBank,
  type V2Competency,
  type V2Dimension,
  type V2LayerKey,
  type V2QuestionBank,
  type V2ScoredItem,
  type V2SocialDesirabilityItem,
  type V2Trait,
  V2_SCALE_POINTS,
} from '@/utils/assessments/v2-question-bank'

type EntityCardProps = {
  title: string
  description: string
  emptyLabel: string
  children: React.ReactNode
  footer?: React.ReactNode
}

function EntityCard({ title, description, emptyLabel, children, footer }: EntityCardProps) {
  return (
    <FoundationSurface className="p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>
        </div>
        {footer ? <div className="shrink-0 self-start">{footer}</div> : null}
      </div>
      <div className="mt-5 space-y-4">
        {children || <p className="text-sm text-[var(--admin-text-muted)]">{emptyLabel}</p>}
      </div>
    </FoundationSurface>
  )
}

type LayerDefinitionEntity = V2Dimension | V2Competency | V2Trait

function LayerDefinitionFields({
  entity,
  onPatch,
}: {
  entity: LayerDefinitionEntity
  onPatch: (patch: Partial<LayerDefinitionEntity>) => void
}) {
  return (
    <>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--admin-text-muted)]">Internal name</span>
          <input value={entity.internalName} onChange={(event) => onPatch({ internalName: event.target.value })} className="foundation-field w-full" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--admin-text-muted)]">External name</span>
          <input value={entity.externalName} onChange={(event) => onPatch({ externalName: event.target.value })} className="foundation-field w-full" />
        </label>
      </div>
      <label className="mt-4 block space-y-1.5">
        <span className="text-xs text-[var(--admin-text-muted)]">Short definition</span>
        <textarea
          value={entity.summaryDefinition}
          onChange={(event) => onPatch({ summaryDefinition: event.target.value })}
          className="foundation-field min-h-20 w-full"
        />
      </label>
      <label className="mt-4 block space-y-1.5">
        <span className="text-xs text-[var(--admin-text-muted)]">Full definition</span>
        <textarea
          value={entity.detailedDefinition}
          onChange={(event) => onPatch({ detailedDefinition: event.target.value })}
          className="foundation-field min-h-28 w-full"
        />
      </label>
      <div className="mt-4 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--admin-text-muted)]">Low behavioural indicators</span>
          <textarea
            value={entity.behaviourIndicators.low}
            onChange={(event) => onPatch({ behaviourIndicators: { ...entity.behaviourIndicators, low: event.target.value } })}
            className="foundation-field min-h-24 w-full"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--admin-text-muted)]">Mid behavioural indicators</span>
          <textarea
            value={entity.behaviourIndicators.mid}
            onChange={(event) => onPatch({ behaviourIndicators: { ...entity.behaviourIndicators, mid: event.target.value } })}
            className="foundation-field min-h-24 w-full"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--admin-text-muted)]">High behavioural indicators</span>
          <textarea
            value={entity.behaviourIndicators.high}
            onChange={(event) => onPatch({ behaviourIndicators: { ...entity.behaviourIndicators, high: event.target.value } })}
            className="foundation-field min-h-24 w-full"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--admin-text-muted)]">Low score summary</span>
          <input
            value={entity.scoreInterpretation.low}
            onChange={(event) => onPatch({ scoreInterpretation: { ...entity.scoreInterpretation, low: event.target.value } })}
            className="foundation-field w-full"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--admin-text-muted)]">High score summary</span>
          <input
            value={entity.scoreInterpretation.high}
            onChange={(event) => onPatch({ scoreInterpretation: { ...entity.scoreInterpretation, high: event.target.value } })}
            className="foundation-field w-full"
          />
        </label>
      </div>
    </>
  )
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function AssessmentV2QuestionsPage() {
  const params = useParams<{ id: string }>()
  const assessmentId = params.id
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const entityRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [questionBank, setQuestionBank] = useState<V2QuestionBank>(createEmptyV2QuestionBank())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'scale' | 'layer_labels' | 'dimensions' | 'competencies' | 'traits' | 'scored_items' | 'social_items'>('dimensions')
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null)
  const [collapsedEntities, setCollapsedEntities] = useState<Record<string, boolean>>({})
  const { isDirty, markSaved } = useUnsavedChanges(questionBank)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/questions`, { cache: 'no-store' })
        const body = (await response.json().catch(() => null)) as { questionBank?: unknown } | null
        if (!active) return

        if (!response.ok) {
          setError('Failed to load the questions structure.')
          return
        }

        const normalized = normalizeV2QuestionBank(body?.questionBank, { preserveDrafts: true })
        setQuestionBank(normalized)
        markSaved(normalized)
        setSavedAt(null)
      } catch {
        if (active) setError('Failed to load the questions structure.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [assessmentId, markSaved])

  const traitOptions = useMemo(
    () => questionBank.traits.map((trait) => ({ key: trait.key, label: trait.internalName || trait.key })),
    [questionBank.traits]
  )

  const questionTabs = [
    { key: 'scale' as const, label: 'Scale', count: null },
    { key: 'layer_labels' as const, label: 'Layer labels', count: null },
    { key: 'dimensions' as const, label: questionBank.layerLabels.dimensions.internalLabel, count: questionBank.dimensions.length },
    { key: 'competencies' as const, label: questionBank.layerLabels.competencies.internalLabel, count: questionBank.competencies.length },
    { key: 'traits' as const, label: questionBank.layerLabels.traits.internalLabel, count: questionBank.traits.length },
    { key: 'scored_items' as const, label: `${questionBank.layerLabels.items.internalLabel} · scored`, count: questionBank.scoredItems.length },
    { key: 'social_items' as const, label: 'Social desirability', count: questionBank.socialItems.length },
  ]

  function setBank(updater: (current: V2QuestionBank) => V2QuestionBank) {
    setQuestionBank((current) => normalizeV2QuestionBank(updater(current), { preserveDrafts: true }))
    setMessage(null)
    setError(null)
  }

  function focusEntity(id: string) {
    setPendingFocusId(id)
  }

  function registerEntityRef(id: string) {
    return (node: HTMLDivElement | null) => {
      entityRefs.current[id] = node
    }
  }

  function toggleEntityCollapsed(id: string) {
    setCollapsedEntities((current) => ({ ...current, [id]: !(current[id] ?? true) }))
  }

  function setLayerCollapsed(ids: string[], collapsed: boolean) {
    setCollapsedEntities((current) => ({
      ...current,
      ...Object.fromEntries(ids.map((id) => [id, collapsed])),
    }))
  }

  useEffect(() => {
    if (!pendingFocusId) return

    const node = entityRefs.current[pendingFocusId]
    if (!node) return

    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const focusTarget = node.querySelector('input, textarea, select') as HTMLElement | null
      focusTarget?.focus()
      setCollapsedEntities((current) => ({ ...current, [pendingFocusId]: false }))
      setPendingFocusId(null)
    })
  }, [pendingFocusId, questionBank])

  function setLayerLabel(layer: V2LayerKey, field: 'internalLabel' | 'externalLabel', value: string) {
    setBank((current) => ({
      ...current,
      layerLabels: {
        ...current.layerLabels,
        [layer]: {
          ...current.layerLabels[layer],
          [field]: value,
        },
      },
    }))
  }

  function setScalePoints(points: number) {
    setBank((current) => {
      const nextPoints = Number(points) as typeof current.scale.points
      const nextLabels = Array.from({ length: nextPoints }, (_, index) => current.scale.labels[index] ?? `Value ${index + 1}`)
      return {
        ...current,
        scale: {
          ...current.scale,
          points: nextPoints,
          labels: nextLabels,
        },
      }
    })
  }

  function setScaleLabel(index: number, value: string) {
    setBank((current) => ({
      ...current,
      scale: {
        ...current.scale,
        labels: current.scale.labels.map((label, labelIndex) => (labelIndex === index ? value : label)),
      },
    }))
  }

  function setScaleOrder(order: 'ascending' | 'descending') {
    setBank((current) => ({
      ...current,
      scale: {
        ...current.scale,
        order,
      },
    }))
  }

  function addDimension() {
    const id = crypto.randomUUID()
    focusEntity(id)
    setBank((current) => {
      const key = makeUniqueKey('dimension', current.dimensions.map((item) => item.key), 'dimension')
      return {
        ...current,
        dimensions: [
          {
            id,
            key,
            internalName: '',
            externalName: '',
            definition: '',
            ...createEmptyLayerContent(),
          },
          ...current.dimensions,
        ],
      }
    })
  }

  function addCompetency() {
    const id = crypto.randomUUID()
    focusEntity(id)
    setBank((current) => {
      const key = makeUniqueKey('competency', current.competencies.map((item) => item.key), 'competency')
      return {
        ...current,
        competencies: [
          {
            id,
            key,
            internalName: '',
            externalName: '',
            definition: '',
            ...createEmptyLayerContent(),
            dimensionKeys: [],
          },
          ...current.competencies,
        ],
      }
    })
  }

  function addTrait() {
    const id = crypto.randomUUID()
    focusEntity(id)
    setBank((current) => {
      const key = makeUniqueKey('trait', current.traits.map((item) => item.key), 'trait')
      return {
        ...current,
        traits: [
          {
            id,
            key,
            internalName: '',
            externalName: '',
            definition: '',
            ...createEmptyLayerContent(),
            competencyKeys: [],
          },
          ...current.traits,
        ],
      }
    })
  }

  function addScoredItem() {
    if (questionBank.traits.length === 0) {
      setError('Add at least one trait before creating scored items.')
      return
    }

    const id = crypto.randomUUID()
    focusEntity(id)
    setBank((current) => {
      const key = makeUniqueKey('item', current.scoredItems.map((item) => item.key), 'item')
      return {
        ...current,
        scoredItems: [
          {
            id,
            key,
            text: '',
            traitKey: current.traits[0]!.key,
            isReverseCoded: false,
            weight: 1,
          },
          ...current.scoredItems,
        ],
      }
    })
  }

  function addSocialItem() {
    const id = crypto.randomUUID()
    focusEntity(id)
    setBank((current) => {
      const key = makeUniqueKey('social_item', current.socialItems.map((item) => item.key), 'social_item')
      return {
        ...current,
        socialItems: [
          {
            id,
            key,
            text: '',
            isReverseCoded: false,
          },
          ...current.socialItems,
        ],
      }
    })
  }

  function updateDimension(id: string, patch: Partial<V2Dimension>) {
    setBank((current) => ({
      ...current,
      dimensions: current.dimensions.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  function updateCompetency(id: string, patch: Partial<V2Competency>) {
    setBank((current) => ({
      ...current,
      competencies: current.competencies.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  function updateTrait(id: string, patch: Partial<V2Trait>) {
    setBank((current) => ({
      ...current,
      traits: current.traits.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  function updateScoredItem(id: string, patch: Partial<V2ScoredItem>) {
    setBank((current) => ({
      ...current,
      scoredItems: current.scoredItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  function updateSocialItem(id: string, patch: Partial<V2SocialDesirabilityItem>) {
    setBank((current) => ({
      ...current,
      socialItems: current.socialItems.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  function deleteDimension(id: string) {
    const target = questionBank.dimensions.find((item) => item.id === id)
    if (!target) return

    setBank((current) => ({
      ...current,
      dimensions: current.dimensions.filter((item) => item.id !== id),
      competencies: current.competencies.map((item) => ({
        ...item,
        dimensionKeys: item.dimensionKeys.filter((key) => key !== target.key),
      })),
    }))
  }

  function deleteCompetency(id: string) {
    const target = questionBank.competencies.find((item) => item.id === id)
    if (!target) return

    setBank((current) => ({
      ...current,
      competencies: current.competencies.filter((item) => item.id !== id),
      traits: current.traits.map((item) => ({
        ...item,
        competencyKeys: item.competencyKeys.filter((key) => key !== target.key),
      })),
    }))
  }

  function deleteTrait(id: string) {
    const target = questionBank.traits.find((item) => item.id === id)
    if (!target) return

    const inUse = questionBank.scoredItems.some((item) => item.traitKey === target.key)
    if (inUse) {
      setError('Delete or reassign scored items before deleting this trait.')
      return
    }

    setBank((current) => ({
      ...current,
      traits: current.traits.filter((item) => item.id !== id),
    }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)
    setSavedAt(null)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionBank }),
      })
      const body = (await response.json().catch(() => null)) as { questionBank?: unknown; error?: string; message?: string } | null
      if (!response.ok) {
        setError(body?.message || (body?.error ? `Failed to save: ${body.error}` : 'Failed to save the V2 questions structure.'))
        return
      }
      const normalized = normalizeV2QuestionBank(body?.questionBank, { preserveDrafts: true })
      setQuestionBank(normalized)
      markSaved(normalized)
      setSavedAt(new Date().toLocaleTimeString())
      setMessage('V2 questions structure saved.')
    } catch {
      setError('Failed to save the V2 questions structure.')
    } finally {
      setSaving(false)
    }
  }

  async function handleExport(template: boolean) {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/questions/export${template ? '?template=1' : ''}`)
      if (!response.ok) throw new Error('export_failed')
      const csv = await response.text()
      downloadCsv(csv || buildV2QuestionBankCsvTemplate(), template ? 'assessment-v2-template.csv' : 'assessment-v2-export.csv')
    } catch {
      setError(template ? 'Failed to download CSV template.' : 'Failed to export CSV.')
    }
  }

  async function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const csvText = await file.text()
    event.target.value = ''

    if (!window.confirm('Replace the current V2 questions structure with the uploaded CSV?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/questions/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      })
      const body = (await response.json().catch(() => null)) as { questionBank?: unknown; error?: string; message?: string } | null
      if (!response.ok) {
        setError(body?.message || (body?.error ? `Failed to import CSV: ${body.error}` : 'Failed to import CSV.'))
        return
      }
      const normalized = normalizeV2QuestionBank(body?.questionBank, { preserveDrafts: true })
      setQuestionBank(normalized)
      markSaved(normalized)
      setSavedAt(new Date().toLocaleTimeString())
      setMessage('CSV imported into the questions structure.')
      setError(null)
    } catch {
      setError('Failed to import CSV.')
    }
  }

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          eyebrow="Assessment workspace"
          title="Questions"
          description="Loading the questions structure."
        />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title="Questions"
        description="Define the scored hierarchy, optional parent layers, social desirability items, and CSV structure for the assessment."
        actions={(
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <FoundationButton type="button" variant="secondary" size="sm" onClick={() => void handleExport(true)}>
                Download template
              </FoundationButton>
              <FoundationButton type="button" variant="secondary" size="sm" onClick={() => void handleExport(false)}>
                Export CSV
              </FoundationButton>
              <FoundationButton type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Upload CSV
              </FoundationButton>
              <FoundationButton type="button" variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </FoundationButton>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => { void handleCsvUpload(event) }}
              />
            </div>
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

      <div className="grid gap-4 md:grid-cols-4">
        <FoundationSurface className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Dimensions</p>
          <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{questionBank.dimensions.length}</p>
        </FoundationSurface>
        <FoundationSurface className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Competencies</p>
          <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{questionBank.competencies.length}</p>
        </FoundationSurface>
        <FoundationSurface className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Traits</p>
          <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{questionBank.traits.length}</p>
        </FoundationSurface>
        <FoundationSurface className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Items</p>
          <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">
            {questionBank.scoredItems.length + questionBank.socialItems.length}
          </p>
        </FoundationSurface>
      </div>

      <FoundationSurface className="p-4">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Question sections">
          {questionTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={['admin-toggle-chip', activeTab === tab.key ? 'admin-toggle-chip-active' : ''].join(' ')}
            >
              {tab.label}
              {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>
      </FoundationSurface>

      {activeTab === 'scale' && (
        <EntityCard
          title="Scale"
          description="Set the response scale used by the assessment, including the point count, the label for each value, and whether the labels should be presented low-to-high or high-to-low."
          emptyLabel=""
        >
          <div className="grid gap-4 md:grid-cols-[220px_220px]">
            <label className="block space-y-1.5">
              <span className="text-xs text-[var(--admin-text-muted)]">Scale points</span>
              <select
                value={questionBank.scale.points}
                onChange={(event) => setScalePoints(Number(event.target.value))}
                className="foundation-field w-full"
              >
                {V2_SCALE_POINTS.map((points) => (
                  <option key={points} value={points}>
                    {points}-point
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs text-[var(--admin-text-muted)]">Display order</span>
              <select
                value={questionBank.scale.order}
                onChange={(event) => setScaleOrder(event.target.value as 'ascending' | 'descending')}
                className="foundation-field w-full"
              >
                <option value="ascending">Low to high</option>
                <option value="descending">High to low</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {questionBank.scale.labels.map((label, index) => (
              <label key={index} className="block space-y-1.5 rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <span className="text-xs text-[var(--admin-text-muted)]">
                  Value {index + 1}
                </span>
                <input
                  value={label}
                  onChange={(event) => setScaleLabel(index, event.target.value)}
                  className="foundation-field w-full"
                />
              </label>
            ))}
          </div>
        </EntityCard>
      )}

      {activeTab === 'layer_labels' && (
        <EntityCard
          title="Layer labels"
          description="Keep the structural layers fixed, but set internal/admin and external/report-facing names per assessment."
          emptyLabel=""
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(['dimensions', 'competencies', 'traits', 'items'] as V2LayerKey[]).map((layer) => (
              <div key={layer} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{questionBank.layerLabels[layer].internalLabel}</p>
                <div className="mt-3 space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Internal label</span>
                    <input
                      value={questionBank.layerLabels[layer].internalLabel}
                      onChange={(event) => setLayerLabel(layer, 'internalLabel', event.target.value)}
                      className="foundation-field w-full"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">External label</span>
                    <input
                      value={questionBank.layerLabels[layer].externalLabel}
                      onChange={(event) => setLayerLabel(layer, 'externalLabel', event.target.value)}
                      className="foundation-field w-full"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </EntityCard>
      )}

      {activeTab === 'dimensions' && (
        <EntityCard
          title={questionBank.layerLabels.dimensions.internalLabel}
          description="Optional top-level grouping layer. Each dimension can be named and defined, and competencies can link into multiple dimensions."
          emptyLabel="No dimensions yet."
          footer={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={() => setLayerCollapsed(questionBank.dimensions.map((item) => item.id), false)}>Expand all</FoundationButton>
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={() => setLayerCollapsed(questionBank.dimensions.map((item) => item.id), true)}>Collapse all</FoundationButton>
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addDimension}>Add dimension</FoundationButton>
            </div>
          )}
        >
          {questionBank.dimensions.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No dimensions configured. Traits and competencies can still work without this layer.</p>
          ) : questionBank.dimensions.map((dimension) => (
            <div
              key={dimension.id}
              ref={registerEntityRef(dimension.id)}
              className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <button type="button" onClick={() => toggleEntityCollapsed(dimension.id)} className="text-left">
                    <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{dimension.internalName || dimension.externalName || dimension.key}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--admin-text-muted)]">{dimension.key}</p>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleEntityCollapsed(dimension.id)} className="text-xs text-[var(--admin-text-muted)]">
                    {collapsedEntities[dimension.id] ?? true ? 'Expand' : 'Collapse'}
                  </button>
                  <button type="button" onClick={() => deleteDimension(dimension.id)} className="text-xs text-red-600">Delete</button>
                </div>
              </div>
              {!(collapsedEntities[dimension.id] ?? true) ? (
                <LayerDefinitionFields entity={dimension} onPatch={(patch) => updateDimension(dimension.id, patch as Partial<V2Dimension>)} />
              ) : null}
            </div>
          ))}
        </EntityCard>
      )}

      {activeTab === 'competencies' && (
        <EntityCard
          title={questionBank.layerLabels.competencies.internalLabel}
          description="Optional middle layer. Competencies can link into multiple dimensions, or remain standalone if dimensions are not used."
          emptyLabel="No competencies yet."
          footer={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={() => setLayerCollapsed(questionBank.competencies.map((item) => item.id), false)}>Expand all</FoundationButton>
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={() => setLayerCollapsed(questionBank.competencies.map((item) => item.id), true)}>Collapse all</FoundationButton>
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addCompetency}>Add competency</FoundationButton>
            </div>
          )}
        >
          {questionBank.competencies.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No competencies configured. Traits can still stand on their own.</p>
          ) : questionBank.competencies.map((competency) => (
            <div
              key={competency.id}
              ref={registerEntityRef(competency.id)}
              className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <button type="button" onClick={() => toggleEntityCollapsed(competency.id)} className="text-left">
                    <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{competency.internalName || competency.externalName || competency.key}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--admin-text-muted)]">{competency.key}</p>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleEntityCollapsed(competency.id)} className="text-xs text-[var(--admin-text-muted)]">
                    {collapsedEntities[competency.id] ?? true ? 'Expand' : 'Collapse'}
                  </button>
                  <button type="button" onClick={() => deleteCompetency(competency.id)} className="text-xs text-red-600">Delete</button>
                </div>
              </div>
              {!(collapsedEntities[competency.id] ?? true) ? (
                <>
                  <LayerDefinitionFields entity={competency} onPatch={(patch) => updateCompetency(competency.id, patch as Partial<V2Competency>)} />
                  <div className="mt-4">
                    <p className="text-xs text-[var(--admin-text-muted)]">Linked dimensions</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {questionBank.dimensions.length === 0 ? (
                        <p className="text-sm text-[var(--admin-text-muted)]">No dimensions available.</p>
                      ) : questionBank.dimensions.map((dimension) => {
                        const checked = competency.dimensionKeys.includes(dimension.key)
                        return (
                          <label key={dimension.key} className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] px-3 py-1.5 text-xs text-[var(--admin-text-primary)]">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => updateCompetency(competency.id, {
                                dimensionKeys: event.target.checked
                                  ? [...competency.dimensionKeys, dimension.key]
                                  : competency.dimensionKeys.filter((key) => key !== dimension.key),
                              })}
                            />
                            {dimension.internalName || dimension.key}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </EntityCard>
      )}

      {activeTab === 'traits' && (
        <EntityCard
          title={questionBank.layerLabels.traits.internalLabel}
          description="Traits are required. Each scored item belongs to exactly one trait, and each trait can link to multiple competencies."
          emptyLabel="No traits yet."
          footer={(
            <div className="flex flex-wrap items-center justify-end gap-2">
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={() => setLayerCollapsed(questionBank.traits.map((item) => item.id), false)}>Expand all</FoundationButton>
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={() => setLayerCollapsed(questionBank.traits.map((item) => item.id), true)}>Collapse all</FoundationButton>
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addTrait}>Add trait</FoundationButton>
            </div>
          )}
        >
          {questionBank.traits.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">Add at least one trait before creating scored items.</p>
          ) : questionBank.traits.map((trait) => (
            <div
              key={trait.id}
              ref={registerEntityRef(trait.id)}
              className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <button type="button" onClick={() => toggleEntityCollapsed(trait.id)} className="text-left">
                    <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{trait.internalName || trait.externalName || trait.key}</p>
                    <p className="mt-1 font-mono text-xs text-[var(--admin-text-muted)]">{trait.key}</p>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleEntityCollapsed(trait.id)} className="text-xs text-[var(--admin-text-muted)]">
                    {collapsedEntities[trait.id] ?? true ? 'Expand' : 'Collapse'}
                  </button>
                  <button type="button" onClick={() => deleteTrait(trait.id)} className="text-xs text-red-600">Delete</button>
                </div>
              </div>
              {!(collapsedEntities[trait.id] ?? true) ? (
                <>
                  <LayerDefinitionFields entity={trait} onPatch={(patch) => updateTrait(trait.id, patch as Partial<V2Trait>)} />
                  <div className="mt-4">
                    <p className="text-xs text-[var(--admin-text-muted)]">Linked competencies</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {questionBank.competencies.length === 0 ? (
                        <p className="text-sm text-[var(--admin-text-muted)]">No competencies available.</p>
                      ) : questionBank.competencies.map((competency) => {
                        const checked = trait.competencyKeys.includes(competency.key)
                        return (
                          <label key={competency.key} className="inline-flex items-center gap-2 rounded-full border border-[var(--admin-border)] px-3 py-1.5 text-xs text-[var(--admin-text-primary)]">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => updateTrait(trait.id, {
                                competencyKeys: event.target.checked
                                  ? [...trait.competencyKeys, competency.key]
                                  : trait.competencyKeys.filter((key) => key !== competency.key),
                              })}
                            />
                            {competency.internalName || competency.key}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </EntityCard>
      )}

      {activeTab === 'scored_items' && (
        <EntityCard
          title={`${questionBank.layerLabels.items.internalLabel} · scored`}
          description="Scored items are the actual assessment questions. Each one belongs to exactly one trait, carries its reverse-coded setting, and can optionally be weighted within that trait."
          emptyLabel="No scored items yet."
          footer={<FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addScoredItem}>Add scored item</FoundationButton>}
        >
          {questionBank.scoredItems.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No scored items yet.</p>
          ) : questionBank.scoredItems.map((item) => (
            <div
              key={item.id}
              ref={registerEntityRef(item.id)}
              className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-[var(--admin-text-muted)]">{item.key}</span>
                <button type="button" onClick={() => setBank((current) => ({ ...current, scoredItems: current.scoredItems.filter((entry) => entry.id !== item.id) }))} className="text-xs text-red-600">Delete</button>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_130px_160px]">
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Item text</span>
                  <textarea value={item.text} onChange={(event) => updateScoredItem(item.id, { text: event.target.value })} className="foundation-field min-h-24 w-full" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Trait</span>
                  <select value={item.traitKey} onChange={(event) => updateScoredItem(item.id, { traitKey: event.target.value })} className="foundation-field w-full">
                    {traitOptions.map((trait) => (
                      <option key={trait.key} value={trait.key}>{trait.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Weight</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={item.weight}
                    onChange={(event) => updateScoredItem(item.id, { weight: Number(event.target.value) })}
                    className="foundation-field w-full"
                  />
                </label>
                <label className="flex items-center gap-2 self-end rounded-[18px] border border-[var(--admin-border)] px-3 py-3 text-sm text-[var(--admin-text-primary)]">
                  <input type="checkbox" checked={item.isReverseCoded} onChange={(event) => updateScoredItem(item.id, { isReverseCoded: event.target.checked })} />
                  Reverse coded
                </label>
              </div>
            </div>
          ))}
        </EntityCard>
      )}

      {activeTab === 'social_items' && (
        <EntityCard
          title="Social desirability items"
          description="These items are stored separately from scored items. They can later be randomized into delivery and used only as a response-style flag."
          emptyLabel="No social desirability items yet."
          footer={<FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addSocialItem}>Add social item</FoundationButton>}
        >
          {questionBank.socialItems.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No social desirability items yet.</p>
          ) : questionBank.socialItems.map((item) => (
            <div
              key={item.id}
              ref={registerEntityRef(item.id)}
              className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-[var(--admin-text-muted)]">{item.key}</span>
                <button type="button" onClick={() => setBank((current) => ({ ...current, socialItems: current.socialItems.filter((entry) => entry.id !== item.id) }))} className="text-xs text-red-600">Delete</button>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Item text</span>
                  <textarea value={item.text} onChange={(event) => updateSocialItem(item.id, { text: event.target.value })} className="foundation-field min-h-24 w-full" />
                </label>
                <label className="flex items-center gap-2 self-end rounded-[18px] border border-[var(--admin-border)] px-3 py-3 text-sm text-[var(--admin-text-primary)]">
                  <input type="checkbox" checked={item.isReverseCoded} onChange={(event) => updateSocialItem(item.id, { isReverseCoded: event.target.checked })} />
                  Reverse coded
                </label>
              </div>
            </div>
          ))}
        </EntityCard>
      )}
    </DashboardPageShell>
  )
}
