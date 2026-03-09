'use client'

import { useState } from 'react'
import type { AddToast, Question } from '../_lib/questions-editor'

type UpdateQuestionPayload = Partial<{
  text: string
  isReverseCoded: boolean
  isActive: boolean
}>

export function QuestionRow({
  question,
  index,
  isFirst,
  isLast,
  assessmentId,
  onUpdated,
  onDeleted,
  onMoveUp,
  onMoveDown,
  addToast,
}: {
  question: Question
  index: number
  isFirst: boolean
  isLast: boolean
  assessmentId: string
  onUpdated: (question: Question) => void
  onDeleted: (id: string) => void
  onMoveUp: () => Promise<void>
  onMoveDown: () => Promise<void>
  addToast: AddToast
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(question.text)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moving, setMoving] = useState(false)

  async function patch(payload: UpdateQuestionPayload) {
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/questions/${question.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await response.json()) as { ok: boolean; question?: Question }
      if (body.ok && body.question) {
        onUpdated(body.question)
      } else {
        addToast('Failed to save', 'error')
      }
    } catch {
      addToast('Failed to save', 'error')
    }

    setSaving(false)
  }

  async function handleSaveEdit() {
    await patch({ text: editText })
    setEditing(false)
  }

  async function handleDelete() {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/questions/${question.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        onDeleted(question.id)
        addToast('Question deleted', 'success')
      } else {
        addToast('Failed to delete', 'error')
      }
    } catch {
      addToast('Failed to delete', 'error')
    }
  }

  async function handleMove(direction: 'up' | 'down') {
    setMoving(true)
    try {
      await (direction === 'up' ? onMoveUp() : onMoveDown())
    } catch {
      addToast('Failed to reorder', 'error')
    }
    setMoving(false)
  }

  return (
    <div className="group flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              rows={2}
              autoFocus
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  void handleSaveEdit()
                }}
                disabled={saving}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setEditText(question.text)
                }}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="cursor-pointer text-sm leading-snug text-zinc-800 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {question.text}
          </p>
        )}
        {!editing && <p className="mt-0.5 font-mono text-xs text-zinc-400">{question.question_key}</p>}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => {
              void handleMove('up')
            }}
            disabled={isFirst || moving}
            title="Move up"
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 dark:hover:text-zinc-200"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => {
              void handleMove('down')
            }}
            disabled={isLast || moving}
            title="Move down"
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 dark:hover:text-zinc-200"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

          <button
            onClick={() => {
              void patch({ isReverseCoded: !question.is_reverse_coded })
            }}
            title="Toggle reverse-coded"
            className={[
              'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
              question.is_reverse_coded
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
            ].join(' ')}
          >
            RC
          </button>

          <button
            onClick={() => {
              void patch({ isActive: !question.is_active })
            }}
            title={question.is_active ? 'Mark inactive' : 'Mark active'}
            className={[
              'h-2.5 w-2.5 rounded-full transition-colors',
              question.is_active ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600',
            ].join(' ')}
          />

          {confirmDelete ? (
            <span className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => {
                  void handleDelete()
                }}
                className="font-medium text-red-600 hover:underline dark:text-red-400"
              >
                Delete?
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                No
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
              title="Delete question"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
