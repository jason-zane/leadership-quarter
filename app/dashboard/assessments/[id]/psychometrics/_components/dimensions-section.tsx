'use client'

import { useState } from 'react'

type Dimension = {
  id: string
  assessment_id: string
  code: string
  name: string
  external_name: string | null
  position: number
}

type Props = {
  assessmentId: string
  initialDimensions: Dimension[]
}

export function DimensionsSection({ assessmentId, initialDimensions }: Props) {
  const [dimensions, setDimensions] = useState<Dimension[]>(initialDimensions)
  const [adding, setAdding] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newExternalName, setNewExternalName] = useState('')
  const [newPosition, setNewPosition] = useState('0')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  // Per-row inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  async function addDimension() {
    if (!newCode.trim() || !newName.trim()) return
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/dimensions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          externalName: newExternalName.trim() || null,
          position: parseInt(newPosition, 10) || 0,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setDimensions((prev) => [...prev, json.dimension])
      setNewCode('')
      setNewName('')
      setNewExternalName('')
      setNewPosition('0')
      setAdding(false)
    } catch {
      setAddError('Failed to create dimension.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteDimension(dimId: string) {
    if (!confirm('Delete this dimension? Traits linked to it will become unlinked.')) return
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/dimensions/${dimId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setDimensions((prev) => prev.filter((d) => d.id !== dimId))
    } catch {
      alert('Failed to delete dimension.')
    }
  }

  function startEdit(dim: Dimension) {
    setEditingId(dim.id)
    setEditValue(dim.external_name ?? '')
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
    setEditError(null)
  }

  async function saveEdit(dimId: string) {
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/dimensions/${dimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ externalName: editValue.trim() || null }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setDimensions((prev) =>
        prev.map((d) => (d.id === dimId ? { ...d, external_name: json.dimension.external_name } : d))
      )
      setEditingId(null)
    } catch {
      setEditError('Failed to save.')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {dimensions.length === 0 && !adding && (
        <p className="text-sm text-[var(--site-text-muted)]">No dimensions configured. Add one to group traits on reports.</p>
      )}

      {dimensions.map((dim) => (
        <div key={dim.id} className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)]">
          <div className="flex items-start justify-between px-4 py-3 gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--site-text-primary)]">
                {dim.name}
                <span className="ml-2 font-mono text-xs text-[var(--site-text-muted)]">{dim.code}</span>
                <span className="ml-2 text-xs text-[var(--site-text-muted)]">pos: {dim.position}</span>
              </p>

              {editingId === dim.id ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="backend-input text-xs flex-1"
                    placeholder="Public name"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <button
                    onClick={() => { void saveEdit(dim.id) }}
                    disabled={editSaving}
                    className="backend-btn-primary text-xs"
                  >
                    {editSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={cancelEdit} className="backend-btn-secondary text-xs">
                    Cancel
                  </button>
                  {editError && <span className="text-xs text-red-600">{editError}</span>}
                </div>
              ) : (
                <p className="text-xs text-[var(--site-text-muted)]">
                  {dim.external_name ? (
                    <>public: {dim.external_name} </>
                  ) : (
                    <>no public name </>
                  )}
                  <button
                    onClick={() => startEdit(dim)}
                    className="text-xs text-zinc-400 hover:text-zinc-700 underline dark:hover:text-zinc-200"
                  >
                    Edit
                  </button>
                </p>
              )}
            </div>
            <button
              onClick={() => { void deleteDimension(dim.id) }}
              className="text-xs text-red-600 hover:underline shrink-0"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="backend-label">Code</label>
              <input
                className="backend-input mt-1"
                placeholder="e.g. leadership"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div>
              <label className="backend-label">Name</label>
              <input
                className="backend-input mt-1"
                placeholder="e.g. Leadership"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="backend-label">Public name (optional)</label>
              <input
                className="backend-input mt-1"
                placeholder="Shown on reports"
                value={newExternalName}
                onChange={(e) => setNewExternalName(e.target.value)}
              />
            </div>
            <div>
              <label className="backend-label">Position</label>
              <input
                className="backend-input mt-1"
                type="number"
                placeholder="0"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="flex gap-2">
            <button onClick={() => { void addDimension() }} disabled={saving} className="backend-btn-primary text-sm">
              {saving ? 'Saving...' : 'Add dimension'}
            </button>
            <button onClick={() => { setAdding(false); setAddError(null) }} className="backend-btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="backend-btn-secondary text-sm">
          + Add dimension
        </button>
      )}
    </div>
  )
}
