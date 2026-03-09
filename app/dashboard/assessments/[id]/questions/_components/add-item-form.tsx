'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { getNextQuestionKey, type AddToast, type Question } from '../_lib/questions-editor'

export function AddItemForm({
  dimensionKey,
  assessmentId,
  questions,
  onAdded,
  addToast,
}: {
  dimensionKey: string
  assessmentId: string
  questions: Question[]
  onAdded: (question: Question) => void
  addToast: AddToast
}) {
  const [text, setText] = useState('')
  const [reverseCoded, setReverseCoded] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submitQuestion() {
    if (!text.trim()) return

    setSaving(true)
    const questionKey = getNextQuestionKey(dimensionKey, questions)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionKey,
          text: text.trim(),
          dimension: dimensionKey,
          isReverseCoded: reverseCoded,
        }),
      })
      const body = (await response.json()) as { ok: boolean; question?: Question }
      if (body.ok && body.question) {
        onAdded(body.question)
        setText('')
        setReverseCoded(false)
        addToast('Question added', 'success')
      } else {
        addToast('Failed to add question', 'error')
      }
    } catch {
      addToast('Failed to add question', 'error')
    }

    setSaving(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitQuestion()
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event)
      }}
      className="mt-2 flex items-start gap-2 px-3"
    >
      <textarea
        placeholder="Add item..."
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={1}
        className="flex-1 resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void submitQuestion()
          }
        }}
      />
      <label className="mt-2 flex shrink-0 items-center gap-1.5 text-xs text-zinc-500">
        <input
          type="checkbox"
          checked={reverseCoded}
          onChange={(event) => setReverseCoded(event.target.checked)}
          className="h-3.5 w-3.5"
        />
        RC
      </label>
      <button
        type="submit"
        disabled={saving || !text.trim()}
        className="mt-1 shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {saving ? '...' : 'Add'}
      </button>
    </form>
  )
}
