'use client'

import { useState } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { Badge } from '@/components/ui/badge'
import { ActionMenu } from '@/components/ui/action-menu'
import { MappingsPanel } from './mappings-panel'

type Question = {
  id: string
  question_key: string
  text: string
  sort_order: number
  is_reverse_coded?: boolean
}

type Mapping = {
  id: string
  trait_id: string
  question_id: string
  weight: number
  reverse_scored: boolean
  assessment_questions: Question | Question[] | null
}

type Dimension = {
  id: string
  code: string
  name: string
  position: number
}

type Trait = {
  id: string
  assessment_id: string
  dimension_id: string | null
  code: string
  name: string
  external_name: string | null
  description: string | null
  score_method: 'mean' | 'sum'
  assessment_dimensions: Dimension | Dimension[] | null
  trait_question_mappings: Mapping[]
}

type EditState = {
  name: string
  externalName: string
  scoreMethod: 'mean' | 'sum'
  dimensionId: string
}

type Props = {
  assessmentId: string
  initialTraits: Trait[]
  questions: Question[]
  dimensions?: Dimension[]
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function TraitsSection({ assessmentId, initialTraits, questions, dimensions = [] }: Props) {
  const [traits, setTraits] = useState<Trait[]>(initialTraits)
  const [expandedTraitId, setExpandedTraitId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newExternalName, setNewExternalName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', externalName: '', scoreMethod: 'mean', dimensionId: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  function startEdit(trait: Trait) {
    setEditingId(trait.id)
    const dim = pickOne(trait.assessment_dimensions)
    setEditState({
      name: trait.name,
      externalName: trait.external_name ?? '',
      scoreMethod: trait.score_method,
      dimensionId: trait.dimension_id ?? '',
    })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function saveEdit(traitId: string) {
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/traits/${traitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editState.name.trim() || undefined,
          externalName: editState.externalName.trim() || null,
          scoreMethod: editState.scoreMethod,
          dimensionId: editState.dimensionId || null,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setTraits((prev) =>
        prev.map((t) =>
          t.id === traitId
            ? {
                ...t,
                name: json.trait.name ?? t.name,
                external_name: json.trait.external_name,
                score_method: json.trait.score_method ?? t.score_method,
                dimension_id: json.trait.dimension_id,
              }
            : t
        )
      )
      setEditingId(null)
    } catch {
      setEditError('Failed to save.')
    } finally {
      setEditSaving(false)
    }
  }

  async function addTrait() {
    if (!newCode.trim() || !newName.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/traits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          externalName: newExternalName.trim() || null,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setTraits((prev) => [...prev, { ...json.trait, assessment_dimensions: null, trait_question_mappings: [] }])
      setNewCode('')
      setNewName('')
      setNewExternalName('')
      setAdding(false)
    } catch {
      setError('Failed to create competency.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTrait(traitId: string) {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/traits/${traitId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setTraits((prev) => prev.filter((t) => t.id !== traitId))
      if (expandedTraitId === traitId) setExpandedTraitId(null)
      setConfirmingDeleteId(null)
    } catch {
      setConfirmingDeleteId(null)
    }
  }

  return (
    <div className="space-y-3">
      {traits.length === 0 && !adding && (
        <p className="text-sm text-[var(--site-text-muted)]">No competencies configured. Add one to get started.</p>
      )}

      {traits.map((trait) => {
        const dimension = pickOne(trait.assessment_dimensions)
        const isExpanded = expandedTraitId === trait.id

        return (
          <div key={trait.id} className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)]">
            <div className="flex items-start justify-between px-4 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--site-text-primary)]">
                    {trait.name}
                    <span className="ml-2 font-mono text-xs text-[var(--site-text-muted)]">{trait.code}</span>
                  </p>
                  <span title="How individual item scores are combined to produce the trait score">
                    <Badge variant="signal-grey">
                      {trait.score_method === 'mean' ? 'Mean' : 'Sum'}
                    </Badge>
                  </span>
                </div>

                <p className="mt-0.5 text-xs text-[var(--site-text-muted)]">
                  {trait.external_name ? `public: ${trait.external_name}` : 'no public name'}
                  {dimension ? ` · ${dimension.name}` : ''}
                  {' · '}
                  {trait.trait_question_mappings.length} question
                  {trait.trait_question_mappings.length !== 1 ? 's' : ''} mapped
                </p>

                {editingId === trait.id && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="backend-label">Name</label>
                        <input
                          className="foundation-field mt-1"
                          value={editState.name}
                          onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="backend-label">Score method</label>
                        <select
                          className="foundation-field mt-1"
                          value={editState.scoreMethod}
                          onChange={(e) => setEditState((s) => ({ ...s, scoreMethod: e.target.value as 'mean' | 'sum' }))}
                        >
                          <option value="mean">Mean — average item scores</option>
                          <option value="sum">Sum — add item scores together</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="backend-label">Public name</label>
                        <input
                          className="foundation-field mt-1"
                          placeholder="Shown on reports"
                          value={editState.externalName}
                          onChange={(e) => setEditState((s) => ({ ...s, externalName: e.target.value }))}
                        />
                      </div>
                      {dimensions.length > 0 && (
                        <div className="col-span-2">
                          <label className="backend-label">Dimension</label>
                          <select
                            className="foundation-field mt-1"
                            value={editState.dimensionId}
                            onChange={(e) => setEditState((s) => ({ ...s, dimensionId: e.target.value }))}
                          >
                            <option value="">No dimension</option>
                            {dimensions.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    {editError && <span className="text-xs text-red-600">{editError}</span>}
                    <div className="flex gap-2">
                      <FoundationButton
                        variant="primary"
                        size="sm"
                        onClick={() => { void saveEdit(trait.id) }}
                        disabled={editSaving}
                      >
                        {editSaving ? 'Saving...' : 'Save'}
                      </FoundationButton>
                      <FoundationButton variant="secondary" size="sm" onClick={cancelEdit}>
                        Cancel
                      </FoundationButton>
                    </div>
                  </div>
                )}
              </div>

              {confirmingDeleteId === trait.id ? (
                <div className="flex gap-2 shrink-0">
                  <FoundationButton variant="danger" size="sm" onClick={() => { void deleteTrait(trait.id) }}>
                    Confirm delete
                  </FoundationButton>
                  <FoundationButton variant="secondary" size="sm" onClick={() => setConfirmingDeleteId(null)}>
                    Cancel
                  </FoundationButton>
                </div>
              ) : (
                <ActionMenu
                  items={[
                    { type: 'item', label: 'Edit', onSelect: () => startEdit(trait) },
                    {
                      type: 'item',
                      label: isExpanded ? 'Close item mappings' : 'Edit item mappings',
                      onSelect: () => setExpandedTraitId(isExpanded ? null : trait.id),
                    },
                    { type: 'separator' },
                    { type: 'item', label: 'Delete', onSelect: () => setConfirmingDeleteId(trait.id), destructive: true },
                  ]}
                />
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-[var(--site-border)] px-4 py-4">
                <MappingsPanel
                  assessmentId={assessmentId}
                  traitId={trait.id}
                  allQuestions={questions}
                  initialMappings={trait.trait_question_mappings}
                />
              </div>
            )}
          </div>
        )
      })}

      {adding ? (
        <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="backend-label">Code</label>
              <input
                className="foundation-field mt-1"
                placeholder="e.g. strategic_thinking"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div>
              <label className="backend-label">Name</label>
              <input
                className="foundation-field mt-1"
                placeholder="e.g. Strategic Thinking"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="backend-label">Public name (optional)</label>
              <input
                className="foundation-field mt-1"
                placeholder="Shown on reports instead of internal name"
                value={newExternalName}
                onChange={(e) => setNewExternalName(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <FoundationButton variant="primary" size="sm" onClick={() => { void addTrait() }} disabled={saving}>
              {saving ? 'Saving...' : '+ Add competency'}
            </FoundationButton>
            <FoundationButton variant="secondary" size="sm" onClick={() => { setAdding(false); setError(null) }}>
              Cancel
            </FoundationButton>
          </div>
        </div>
      ) : (
        <FoundationButton variant="secondary" size="sm" onClick={() => setAdding(true)}>
          + Add competency
        </FoundationButton>
      )}
    </div>
  )
}
