'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Question = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
  is_active: boolean
}

type ScoringConfig = {
  dimensions?: Array<{ key: string; label: string }>
}

// Inline-edit row
function QuestionRow({
  question,
  index,
  surveyId,
  dimensions,
  onUpdated,
  onDeleted,
}: {
  question: Question
  index: number
  surveyId: string
  dimensions: Array<{ key: string; label: string }>
  onUpdated: (q: Question) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(question.text)
  const [editDimension, setEditDimension] = useState(question.dimension)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function patch(payload: Partial<{ text: string; dimension: string; isReverseCoded: boolean; isActive: boolean }>) {
    setSaving(true)
    const res = await fetch(`/api/admin/assessments/${surveyId}/questions/${question.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = (await res.json()) as { ok: boolean; question?: Question }
    setSaving(false)
    if (body.ok && body.question) onUpdated(body.question)
  }

  async function handleSaveEdit() {
    await patch({ text: editText, dimension: editDimension })
    setEditing(false)
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/assessments/${surveyId}/questions/${question.id}`, {
      method: 'DELETE',
    })
    if (res.ok) onDeleted(question.id)
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Number */}
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800">
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="flex items-center gap-3">
              <select
                value={editDimension}
                onChange={(e) => setEditDimension(e.target.value)}
                className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {dimensions.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
              <button onClick={handleSaveEdit} disabled={saving} className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setEditText(question.text); setEditDimension(question.dimension) }} className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="cursor-pointer text-sm text-zinc-800 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {question.text}
          </p>
        )}
        {!editing && (
          <p className="mt-1 text-xs text-zinc-400">
            {dimensions.find((d) => d.key === question.dimension)?.label ?? question.dimension}
            {question.is_reverse_coded && ' · Reverse coded'}
          </p>
        )}
      </div>

      {/* Actions */}
      {!editing && (
        <div className="flex shrink-0 items-center gap-2">
          {/* RC toggle */}
          <button
            onClick={() => patch({ isReverseCoded: !question.is_reverse_coded })}
            title="Toggle reverse-coded"
            className={[
              'rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
              question.is_reverse_coded
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
            ].join(' ')}
          >
            RC
          </button>

          {/* Active toggle */}
          <button
            onClick={() => patch({ isActive: !question.is_active })}
            title={question.is_active ? 'Mark inactive' : 'Mark active'}
            className={[
              'h-3 w-3 rounded-full transition-colors',
              question.is_active ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600',
            ].join(' ')}
          />

          {/* Delete */}
          {confirmDelete ? (
            <span className="flex items-center gap-1.5 text-xs">
              <button onClick={handleDelete} className="font-medium text-red-600 hover:underline dark:text-red-400">Delete?</button>
              <button onClick={() => setConfirmDelete(false)} className="text-zinc-400 hover:text-zinc-700">No</button>
            </span>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400" title="Delete question">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function SurveyQuestionsPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id
  const [questions, setQuestions] = useState<Question[]>([])
  const [dimensions, setDimensions] = useState<Array<{ key: string; label: string }>>([])
  const [addText, setAddText] = useState('')
  const [addDimension, setAddDimension] = useState('')
  const [addKey, setAddKey] = useState('')
  const [addRC, setAddRC] = useState(false)
  const [addSaving, setAddSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const [qRes, sRes] = await Promise.all([
        fetch(`/api/admin/assessments/${surveyId}/questions`, { cache: 'no-store' }),
        fetch(`/api/admin/assessments/${surveyId}/scoring`, { cache: 'no-store' }),
      ])
      const qBody = (await qRes.json()) as { questions?: Question[] }
      const sBody = (await sRes.json()) as { scoringConfig?: ScoringConfig }
      if (!active) return
      setQuestions(qBody.questions ?? [])
      const dims = sBody.scoringConfig?.dimensions?.map((d) => ({ key: d.key, label: d.label })) ?? []
      setDimensions(dims)
      setAddDimension((prev) => prev || dims[0]?.key || '')
    })()
    return () => {
      active = false
    }
  }, [surveyId])

  function handleUpdated(updated: Question) {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)))
  }

  function handleDeleted(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addText.trim() || !addKey.trim() || !addDimension) return
    setAddSaving(true)
    const res = await fetch(`/api/admin/assessments/${surveyId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionKey: addKey.trim(), text: addText.trim(), dimension: addDimension, isReverseCoded: addRC }),
    })
    const body = (await res.json()) as { ok: boolean; question?: Question }
    if (body.ok && body.question) {
      setQuestions((prev) => [...prev, body.question!])
      setAddText('')
      setAddKey('')
      setAddRC(false)
    }
    setAddSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </h2>
      </div>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <QuestionRow
            key={q.id}
            question={q}
            index={i}
            surveyId={surveyId}
            dimensions={dimensions}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        ))}
      </div>

      {/* Add question */}
      <form onSubmit={handleAdd} className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Add question</p>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Question key (e.g. q19)"
              value={addKey}
              onChange={(e) => setAddKey(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <select
              value={addDimension}
              onChange={(e) => setAddDimension(e.target.value)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {dimensions.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Question text"
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" checked={addRC} onChange={(e) => setAddRC(e.target.checked)} className="h-3.5 w-3.5" />
              Reverse coded
            </label>
            <button
              type="submit"
              disabled={addSaving || !addText.trim() || !addKey.trim()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {addSaving ? 'Adding…' : 'Add question'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
