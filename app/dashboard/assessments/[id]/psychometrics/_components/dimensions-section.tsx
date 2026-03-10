'use client'

import { useState } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { ActionMenu } from '@/components/ui/action-menu'

type Dimension = {
  id: string
  assessment_id: string
  code: string
  name: string
  external_name: string | null
  position: number
}

type EditState = {
  name: string
  externalName: string
  position: string
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', externalName: '', position: '0' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

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
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/dimensions/${dimId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setDimensions((prev) => prev.filter((d) => d.id !== dimId))
      setConfirmingDeleteId(null)
    } catch {
      setConfirmingDeleteId(null)
    }
  }

  function startEdit(dim: Dimension) {
    setEditingId(dim.id)
    setEditState({
      name: dim.name,
      externalName: dim.external_name ?? '',
      position: String(dim.position),
    })
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function saveEdit(dimId: string) {
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/dimensions/${dimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editState.name.trim() || undefined,
          externalName: editState.externalName.trim() || null,
          position: parseInt(editState.position, 10) || 0,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setDimensions((prev) =>
        prev.map((d) => (d.id === dimId ? { ...d, ...json.dimension } : d))
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
              <p className="text-xs text-[var(--site-text-muted)]">
                {dim.external_name ? `public: ${dim.external_name}` : 'no public name'}
              </p>

              {editingId === dim.id && (
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
                      <label className="backend-label">Position</label>
                      <input
                        className="foundation-field mt-1"
                        type="number"
                        value={editState.position}
                        onChange={(e) => setEditState((s) => ({ ...s, position: e.target.value }))}
                      />
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
                  </div>
                  {editError && <span className="text-xs text-red-600">{editError}</span>}
                  <div className="flex gap-2">
                    <FoundationButton
                      variant="primary"
                      size="sm"
                      onClick={() => { void saveEdit(dim.id) }}
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

            {confirmingDeleteId === dim.id ? (
              <div className="flex gap-2 shrink-0">
                <FoundationButton variant="danger" size="sm" onClick={() => { void deleteDimension(dim.id) }}>
                  Confirm delete
                </FoundationButton>
                <FoundationButton variant="secondary" size="sm" onClick={() => setConfirmingDeleteId(null)}>
                  Cancel
                </FoundationButton>
              </div>
            ) : (
              <ActionMenu
                items={[
                  { type: 'item', label: 'Edit', onSelect: () => startEdit(dim) },
                  { type: 'separator' },
                  { type: 'item', label: 'Delete', onSelect: () => setConfirmingDeleteId(dim.id), destructive: true },
                ]}
              />
            )}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="backend-label">Code</label>
              <input
                className="foundation-field mt-1"
                placeholder="e.g. leadership"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
            <div>
              <label className="backend-label">Name</label>
              <input
                className="foundation-field mt-1"
                placeholder="e.g. Leadership"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="backend-label">Public name (optional)</label>
              <input
                className="foundation-field mt-1"
                placeholder="Shown on reports"
                value={newExternalName}
                onChange={(e) => setNewExternalName(e.target.value)}
              />
            </div>
            <div>
              <label className="backend-label">Position</label>
              <input
                className="foundation-field mt-1"
                type="number"
                placeholder="0"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <div className="flex gap-2">
            <FoundationButton variant="primary" size="sm" onClick={() => { void addDimension() }} disabled={saving}>
              {saving ? 'Saving...' : 'Add dimension'}
            </FoundationButton>
            <FoundationButton variant="secondary" size="sm" onClick={() => { setAdding(false); setAddError(null) }}>
              Cancel
            </FoundationButton>
          </div>
        </div>
      ) : (
        <FoundationButton variant="secondary" size="sm" onClick={() => setAdding(true)}>
          + Add dimension
        </FoundationButton>
      )}
    </div>
  )
}
