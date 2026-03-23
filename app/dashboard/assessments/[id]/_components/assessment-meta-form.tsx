'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAutoSave } from '@/components/dashboard/hooks/use-auto-save'
import { AutoSaveStatus } from '@/components/dashboard/ui/auto-save-status'

type Props = {
  assessmentId: string
  initialExternalName: string | null
  initialDescription: string | null
}

export function AssessmentMetaForm({ assessmentId, initialExternalName, initialDescription }: Props) {
  const [externalName, setExternalName] = useState(initialExternalName ?? '')
  const [description, setDescription] = useState(initialDescription ?? '')
  const snapshot = useMemo(
    () => ({ externalName, description }),
    [description, externalName]
  )

  const onSave = useCallback(async (data: { externalName: string; description: string }) => {
    const nextExternalName = data.externalName.trim()
    const nextDescription = data.description.trim()
    const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_name: nextExternalName || null,
        description: nextDescription || null,
      }),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error ?? 'Failed to save.')
    setExternalName(nextExternalName)
    setDescription(nextDescription)
  }, [assessmentId])

  const { status, error, savedAt, saveNow, markSaved } = useAutoSave({
    data: snapshot,
    onSave,
    saveOn: 'blur',
  })

  useEffect(() => {
    markSaved({
      externalName: initialExternalName ?? '',
      description: initialDescription ?? '',
    })
  }, [initialDescription, initialExternalName, markSaved])

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">Public metadata</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Public name</span>
          <input
            value={externalName}
            onChange={(e) => setExternalName(e.target.value)}
            onBlur={() => void saveNow()}
            placeholder="Shown on reports instead of internal name"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => void saveNow()}
            placeholder="Short description shown on reports"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>
      <div className="mt-2">
        <AutoSaveStatus status={status} error={error} savedAt={savedAt} onRetry={() => void saveNow()} />
      </div>
    </div>
  )
}
