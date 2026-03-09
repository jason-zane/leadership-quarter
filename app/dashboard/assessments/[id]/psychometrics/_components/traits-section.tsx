'use client'

import { useState } from 'react'
import { MappingsPanel } from './mappings-panel'

type Question = {
  id: string
  question_key: string
  text: string
  sort_order: number
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

type Props = {
  assessmentId: string
  initialTraits: Trait[]
  questions: Question[]
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function TraitsSection({ assessmentId, initialTraits, questions }: Props) {
  const [traits, setTraits] = useState<Trait[]>(initialTraits)
  const [expandedTraitId, setExpandedTraitId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newExternalName, setNewExternalName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Inline external_name edit state
  const [editingExternalNameId, setEditingExternalNameId] = useState<string | null>(null)
  const [editExternalNameValue, setEditExternalNameValue] = useState('')
  const [editExternalNameSaving, setEditExternalNameSaving] = useState(false)
  const [editExternalNameError, setEditExternalNameError] = useState<string | null>(null)

  function startEditExternalName(trait: Trait) {
    setEditingExternalNameId(trait.id)
    setEditExternalNameValue(trait.external_name ?? '')
    setEditExternalNameError(null)
  }

  function cancelEditExternalName() {
    setEditingExternalNameId(null)
    setEditExternalNameValue('')
    setEditExternalNameError(null)
  }

  async function saveExternalName(traitId: string) {
    setEditExternalNameSaving(true)
    setEditExternalNameError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/traits/${traitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalName: editExternalNameValue.trim() || null }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setTraits((prev) =>
        prev.map((t) => (t.id === traitId ? { ...t, external_name: json.trait.external_name } : t))
      )
      setEditingExternalNameId(null)
    } catch {
      setEditExternalNameError('Failed to save.')
    } finally {
      setEditExternalNameSaving(false)
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
      setError('Failed to create trait.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteTrait(traitId: string) {
    if (!confirm('Delete this trait and all its question mappings?')) return
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/traits/${traitId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setTraits((prev) => prev.filter((t) => t.id !== traitId))
      if (expandedTraitId === traitId) setExpandedTraitId(null)
    } catch {
      alert('Failed to delete trait.')
    }
  }

  return (
    <div className="space-y-3">
      {traits.length === 0 && !adding && (
        <p className="text-sm text-[var(--site-text-muted)]">No traits configured. Add one to get started.</p>
      )}

      {traits.map((trait) => {
        const dimension = pickOne(trait.assessment_dimensions)
        const isExpanded = expandedTraitId === trait.id

        return (
          <div key={trait.id} className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)]">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--site-text-primary)]">
                  {trait.name}
                  <span className="ml-2 font-mono text-xs text-[var(--site-text-muted)]">{trait.code}</span>
                </p>
                {editingExternalNameId === trait.id ? (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="backend-input text-xs flex-1"
                      placeholder="Public name"
                      value={editExternalNameValue}
                      onChange={(e) => setEditExternalNameValue(e.target.value)}
                    />
                    <button
                      onClick={() => { void saveExternalName(trait.id) }}
                      disabled={editExternalNameSaving}
                      className="backend-btn-primary text-xs"
                    >
                      {editExternalNameSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={cancelEditExternalName} className="backend-btn-secondary text-xs">
                      Cancel
                    </button>
                    {editExternalNameError && <span className="text-xs text-red-600">{editExternalNameError}</span>}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--site-text-muted)]">
                    {trait.external_name ? <>public: {trait.external_name} </> : <>no public name </>}
                    <button
                      onClick={() => startEditExternalName(trait)}
                      className="text-xs text-zinc-400 hover:text-zinc-700 underline dark:hover:text-zinc-200"
                    >
                      Edit
                    </button>
                  </p>
                )}
                {dimension && (
                  <p className="text-xs text-[var(--site-text-muted)]">{dimension.name}</p>
                )}
                <p className="text-xs text-[var(--site-text-muted)]">
                  {trait.trait_question_mappings.length} question
                  {trait.trait_question_mappings.length !== 1 ? 's' : ''} mapped &middot; {trait.score_method}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedTraitId(isExpanded ? null : trait.id)}
                  className="backend-btn-secondary text-xs"
                >
                  {isExpanded ? 'Close' : 'Edit mappings'}
                </button>
                <button
                  onClick={() => deleteTrait(trait.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
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
                className="backend-input mt-1"
                placeholder="e.g. strategic_thinking"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div>
              <label className="backend-label">Name</label>
              <input
                className="backend-input mt-1"
                placeholder="e.g. Strategic Thinking"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="backend-label">Public name (optional)</label>
              <input
                className="backend-input mt-1"
                placeholder="Shown on reports instead of internal name"
                value={newExternalName}
                onChange={(e) => setNewExternalName(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addTrait} disabled={saving} className="backend-btn-primary text-sm">
              {saving ? 'Saving...' : 'Add trait'}
            </button>
            <button onClick={() => { setAdding(false); setError(null) }} className="backend-btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="backend-btn-secondary text-sm">
          + Add trait
        </button>
      )}
    </div>
  )
}
