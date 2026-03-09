'use client'

import { useState } from 'react'

export function DescriptionEditor({
  description,
  onSave,
}: {
  description: string | undefined
  onSave: (newDesc: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(Boolean(description))
  const [draft, setDraft] = useState(description ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
  }

  if (!expanded && !description) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mt-0.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        + Add description
      </button>
    )
  }

  return (
    <div className="mt-1">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={2}
        placeholder="Optional instruction or context for respondents"
        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={() => {
            void handleSave()
          }}
          disabled={saving || draft === (description ?? '')}
          className="rounded bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {!description && (
          <button
            onClick={() => {
              setExpanded(false)
              setDraft('')
            }}
            className="text-xs text-zinc-400 hover:text-zinc-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
