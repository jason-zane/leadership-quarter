'use client'

import { useState } from 'react'

export function InlineLabelEditor({
  label,
  onSave,
}: {
  label: string
  onSave: (newLabel: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (draft.trim() === label) {
      setEditing(false)
      return
    }

    setSaving(true)
    await onSave(draft.trim())
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void handleSave()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void handleSave()
          }
          if (event.key === 'Escape') {
            setEditing(false)
            setDraft(label)
          }
        }}
        disabled={saving}
        className="rounded border border-zinc-300 px-2 py-0.5 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-950"
      />
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(label)
        setEditing(true)
      }}
      className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
      title="Click to edit label"
    >
      {label}
    </button>
  )
}
