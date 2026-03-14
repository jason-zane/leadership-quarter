'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'

type Props = {
  assessmentId: string
  initialExternalName: string | null
  initialDescription: string | null
}

export function AssessmentMetaForm({ assessmentId, initialExternalName, initialDescription }: Props) {
  const [externalName, setExternalName] = useState(initialExternalName ?? '')
  const [description, setDescription] = useState(initialDescription ?? '')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const snapshot = useMemo(
    () => ({ externalName, description }),
    [description, externalName]
  )
  const { isDirty, markSaved } = useUnsavedChanges(snapshot)

  useEffect(() => {
    markSaved({
      externalName: initialExternalName ?? '',
      description: initialDescription ?? '',
    })
  }, [initialDescription, initialExternalName, markSaved])

  async function save() {
    setSaving(true)
    setError(null)
    setSavedAt(null)
    try {
      const nextExternalName = externalName.trim()
      const nextDescription = description.trim()
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_name: nextExternalName || null,
          description: nextDescription || null,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setExternalName(nextExternalName)
      setDescription(nextDescription)
      markSaved({
        externalName: nextExternalName,
        description: nextDescription,
      })
      setSavedAt(new Date().toLocaleTimeString())
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Public metadata</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Public name</span>
          <input
            value={externalName}
            onChange={(e) => setExternalName(e.target.value)}
            placeholder="Shown on reports instead of internal name"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description shown on reports"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {isDirty ? <p className="mt-2 text-xs font-medium text-amber-700">Unsaved changes</p> : null}
      {!isDirty && savedAt ? <p className="mt-2 text-xs text-emerald-600">Saved at {savedAt}</p> : null}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => { void save() }}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
