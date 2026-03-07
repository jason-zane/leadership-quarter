'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import type { ScoringConfig, ScoringBand, ScoringDimension } from '@/utils/assessments/types'
import { createEmptyScoringConfig, normalizeScoringConfig } from '@/utils/assessments/scoring-config'

type Question = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
  is_active: boolean
}

type CsvRow = {
  construct_key: string
  construct_label: string
  item_text: string
  reverse_coded: boolean
}

type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

function toKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function getNextKey(dimensionKey: string, questions: Question[]): string {
  const existing = questions.filter((q) => q.dimension === dimensionKey)
  return `${dimensionKey}_${existing.length + 1}`
}

function downloadCSVTemplate() {
  const content = [
    'construct_key,construct_label,item_text,reverse_coded',
    'openness,Openness to AI,"I am comfortable using AI tools in my daily work",false',
    'openness,Openness to AI,"AI makes me feel anxious or uncertain",true',
  ].join('\n')
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'assessment_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  function parseRow(line: string): string[] {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    fields.push(current)
    return fields
  }

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const [construct_key, construct_label, item_text, reverse_coded] = parseRow(line)
    if (!construct_key || !item_text) continue
    rows.push({
      construct_key: construct_key.trim(),
      construct_label: construct_label?.trim() || construct_key.trim(),
      item_text: item_text.trim(),
      reverse_coded: String(reverse_coded).toLowerCase() === 'true',
    })
  }
  return rows
}

// ── Toast system ──────────────────────────────────────────────────────────────
function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg',
            t.type === 'success'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-red-600 text-white',
          ].join(' ')}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── Inline label editor ───────────────────────────────────────────────────────
function InlineLabelEditor({
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
    if (draft.trim() === label) { setEditing(false); return }
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
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { void handleSave() }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); void handleSave() }
          if (e.key === 'Escape') { setEditing(false); setDraft(label) }
        }}
        disabled={saving}
        className="rounded border border-zinc-300 px-2 py-0.5 text-sm font-semibold dark:border-zinc-700 dark:bg-zinc-950"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(label); setEditing(true) }}
      className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
      title="Click to edit label"
    >
      {label}
    </button>
  )
}

// ── Description editor ────────────────────────────────────────────────────────
function DescriptionEditor({
  description,
  onSave,
}: {
  description: string | undefined
  onSave: (newDesc: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(!!description)
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
        onChange={(e) => setDraft(e.target.value)}
        rows={2}
        placeholder="Optional instruction or context for respondents"
        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
      />
      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={() => { void handleSave() }}
          disabled={saving || draft === (description ?? '')}
          className="rounded px-2.5 py-1 text-xs font-medium bg-zinc-900 text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {!description && (
          <button
            onClick={() => { setExpanded(false); setDraft('') }}
            className="text-xs text-zinc-400 hover:text-zinc-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

// ── Question row (inline-edit + reorder) ──────────────────────────────────────
function QuestionRow({
  question,
  index,
  isFirst,
  isLast,
  surveyId,
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
  surveyId: string
  onUpdated: (q: Question) => void
  onDeleted: (id: string) => void
  onMoveUp: () => Promise<void>
  onMoveDown: () => Promise<void>
  addToast: (message: string, type: 'success' | 'error') => void
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(question.text)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [moving, setMoving] = useState(false)

  async function patch(payload: Partial<{ text: string; isReverseCoded: boolean; isActive: boolean }>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${surveyId}/questions/${question.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await res.json()) as { ok: boolean; question?: Question }
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
      const res = await fetch(`/api/admin/assessments/${surveyId}/questions/${question.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
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
    <div className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={2}
              autoFocus
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => { void handleSaveEdit() }}
                disabled={saving}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditText(question.text) }}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className="cursor-pointer text-sm text-zinc-800 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300 leading-snug"
            onClick={() => setEditing(true)}
            title="Click to edit"
          >
            {question.text}
          </p>
        )}
        {!editing && (
          <p className="mt-0.5 text-xs font-mono text-zinc-400">{question.question_key}</p>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Reorder arrows */}
          <button
            onClick={() => { void handleMove('up') }}
            disabled={isFirst || moving}
            title="Move up"
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 dark:hover:text-zinc-200"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => { void handleMove('down') }}
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
            onClick={() => { void patch({ isReverseCoded: !question.is_reverse_coded }) }}
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
            onClick={() => { void patch({ isActive: !question.is_active }) }}
            title={question.is_active ? 'Mark inactive' : 'Mark active'}
            className={[
              'h-2.5 w-2.5 rounded-full transition-colors',
              question.is_active ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600',
            ].join(' ')}
          />

          {confirmDelete ? (
            <span className="flex items-center gap-1.5 text-xs">
              <button onClick={() => { void handleDelete() }} className="font-medium text-red-600 hover:underline dark:text-red-400">
                Delete?
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-zinc-400 hover:text-zinc-700">
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

// ── Add item form (per construct) ─────────────────────────────────────────────
function AddItemForm({
  dimensionKey,
  surveyId,
  questions,
  onAdded,
  addToast,
}: {
  dimensionKey: string
  surveyId: string
  questions: Question[]
  onAdded: (q: Question) => void
  addToast: (message: string, type: 'success' | 'error') => void
}) {
  const [text, setText] = useState('')
  const [rc, setRc] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    const questionKey = getNextKey(dimensionKey, questions)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/assessments/${surveyId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionKey,
          text: text.trim(),
          dimension: dimensionKey,
          isReverseCoded: rc,
        }),
      })
      const body = (await res.json()) as { ok: boolean; question?: Question }
      if (body.ok && body.question) {
        onAdded(body.question)
        setText('')
        setRc(false)
        addToast('Question added', 'success')
      } else {
        addToast('Failed to add question', 'error')
      }
    } catch {
      addToast('Failed to add question', 'error')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={(e) => { void handleAdd(e) }} className="mt-2 flex items-start gap-2 px-3">
      <textarea
        placeholder="Add item…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm resize-none dark:border-zinc-700 dark:bg-zinc-950"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAdd(e) }
        }}
      />
      <label className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500 shrink-0">
        <input type="checkbox" checked={rc} onChange={(e) => setRc(e.target.checked)} className="h-3.5 w-3.5" />
        RC
      </label>
      <button
        type="submit"
        disabled={saving || !text.trim()}
        className="mt-1 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 shrink-0"
      >
        {saving ? '…' : 'Add'}
      </button>
    </form>
  )
}

// ── CSV preview modal ─────────────────────────────────────────────────────────
function CsvPreviewModal({
  rows,
  onConfirm,
  onCancel,
}: {
  rows: CsvRow[]
  onConfirm: () => void
  onCancel: () => void
}) {
  const byConstruct = rows.reduce<Record<string, { label: string; items: CsvRow[] }>>((acc, row) => {
    if (!acc[row.construct_key]) {
      acc[row.construct_key] = { label: row.construct_label, items: [] }
    }
    acc[row.construct_key].items.push(row)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 max-h-[80vh] flex flex-col">
        <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          CSV preview — {rows.length} item{rows.length !== 1 ? 's' : ''}
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.entries(byConstruct).map(([key, { label, items }]) => (
            <div key={key}>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {label} <span className="font-mono font-normal text-zinc-400">({key})</span>
                <span className="ml-2 text-zinc-400">— {items.length} item{items.length !== 1 ? 's' : ''}</span>
              </p>
              <ul className="mt-1 space-y-0.5 pl-3">
                {items.map((item, i) => (
                  <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                    <span className="shrink-0">{i + 1}.</span>
                    <span>{item.item_text}{item.reverse_coded && <span className="ml-1 text-amber-600"> (RC)</span>}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SurveyQuestionsPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id
  const [questions, setQuestions] = useState<Question[]>([])
  const [config, setConfig] = useState<ScoringConfig | null>(null)
  const [newConstructLabel, setNewConstructLabel] = useState('')
  const [addingConstruct, setAddingConstruct] = useState(false)
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

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
      setConfig(normalizeScoringConfig(sBody.scoringConfig ?? createEmptyScoringConfig()))
    })()
    return () => { active = false }
  }, [surveyId])

  function handleUpdated(updated: Question) {
    setQuestions((prev) => prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q)))
  }

  function handleDeleted(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  function handleAdded(q: Question) {
    setQuestions((prev) => [...prev, q])
  }

  async function saveConfig(newConfig: ScoringConfig): Promise<boolean> {
    try {
      const res = await fetch(`/api/admin/assessments/${surveyId}/scoring`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoringConfig: newConfig }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function handleSaveDimensionLabel(key: string, newLabel: string) {
    if (!config) return
    const newConfig: ScoringConfig = {
      ...config,
      dimensions: config.dimensions.map((d) =>
        d.key === key ? { ...d, label: newLabel } : d
      ),
    }
    const ok = await saveConfig(newConfig)
    if (ok) {
      setConfig(newConfig)
      addToast('Label saved', 'success')
    } else {
      addToast('Failed to save label', 'error')
    }
  }

  async function handleSaveDimensionDescription(key: string, description: string) {
    if (!config) return
    const newConfig: ScoringConfig = {
      ...config,
      dimensions: config.dimensions.map((d) =>
        d.key === key ? { ...d, description: description || undefined } : d
      ),
    }
    const ok = await saveConfig(newConfig)
    if (ok) {
      setConfig(newConfig)
      addToast('Description saved', 'success')
    } else {
      addToast('Failed to save description', 'error')
    }
  }

  async function handleAddConstruct(e: React.FormEvent) {
    e.preventDefault()
    const label = newConstructLabel.trim()
    if (!label || !config) return
    const key = toKey(label)
    if (config.dimensions.some((d) => d.key === key)) return

    setAddingConstruct(true)
    const newConfig: ScoringConfig = {
        ...config,
        dimensions: [
          ...config.dimensions,
          { key, label, question_keys: [], bands: [] as ScoringBand[] },
        ],
      }
    const ok = await saveConfig(newConfig)
    if (ok) {
      setConfig(newConfig)
      setNewConstructLabel('')
      addToast('Construct added', 'success')
    } else {
      addToast('Failed to add construct', 'error')
    }
    setAddingConstruct(false)
  }

  async function handleDeleteConstruct(key: string) {
    if (!config) return
    const hasQuestions = questions.some((q) => q.dimension === key)
    if (hasQuestions) return
    if (!confirm(`Delete construct "${key}"?`)) return

    const newConfig: ScoringConfig = {
      ...config,
      dimensions: config.dimensions.filter((d) => d.key !== key),
    }
    const ok = await saveConfig(newConfig)
    if (ok) {
      setConfig(newConfig)
      addToast('Construct deleted', 'success')
    } else {
      addToast('Failed to delete construct', 'error')
    }
  }

  async function handleMoveQuestion(dimKey: string, fromIndex: number, direction: 'up' | 'down') {
    const dimQuestions = questions
      .filter((q) => q.dimension === dimKey)
      .sort((a, b) => a.sort_order - b.sort_order)

    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= dimQuestions.length) return

    const qA = dimQuestions[fromIndex]
    const qB = dimQuestions[toIndex]
    const sortA = qA.sort_order
    const sortB = qB.sort_order

    // Optimistic update
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === qA.id) return { ...q, sort_order: sortB }
        if (q.id === qB.id) return { ...q, sort_order: sortA }
        return q
      })
    )

    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/admin/assessments/${surveyId}/questions/${qA.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: sortB }),
        }),
        fetch(`/api/admin/assessments/${surveyId}/questions/${qB.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: sortA }),
        }),
      ])
      if (!resA.ok || !resB.ok) {
        // Revert
        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id === qA.id) return { ...q, sort_order: sortA }
            if (q.id === qB.id) return { ...q, sort_order: sortB }
            return q
          })
        )
        addToast('Failed to reorder', 'error')
      }
    } catch {
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id === qA.id) return { ...q, sort_order: sortA }
          if (q.id === qB.id) return { ...q, sort_order: sortB }
          return q
        })
      )
      addToast('Failed to reorder', 'error')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      setCsvRows(rows)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleCSVImport() {
    if (!csvRows || !config) return
    setImporting(true)

    const existingKeys = new Set(config.dimensions.map((d) => d.key))
    const newConstructs = [...new Map(csvRows.map((r) => [r.construct_key, r])).values()]
      .filter((r) => !existingKeys.has(r.construct_key))

    let updatedConfig = config
    if (newConstructs.length > 0) {
      updatedConfig = {
        ...config,
        dimensions: [
          ...config.dimensions,
          ...newConstructs.map((r) => ({
            key: r.construct_key,
            label: r.construct_label,
            question_keys: [],
            bands: [] as ScoringBand[],
          })),
        ],
      }
      await saveConfig(updatedConfig)
      setConfig(updatedConfig)
    }

    const dimensionCounts: Record<string, number> = {}
    for (const q of questions) {
      dimensionCounts[q.dimension] = (dimensionCounts[q.dimension] ?? 0) + 1
    }

    const toInsert = csvRows.map((row) => {
      const count = (dimensionCounts[row.construct_key] ?? 0) + 1
      dimensionCounts[row.construct_key] = count
      return {
        questionKey: `${row.construct_key}_${count}`,
        text: row.item_text,
        dimension: row.construct_key,
        isReverseCoded: row.reverse_coded,
      }
    })

    try {
      const res = await fetch(`/api/admin/assessments/${surveyId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toInsert),
      })
      const body = (await res.json()) as { ok: boolean; questions?: Question[] }
      if (body.ok && body.questions) {
        setQuestions((prev) => [...prev, ...body.questions!])
        addToast(`Imported ${body.questions.length} questions`, 'success')
      } else {
        addToast('Import failed', 'error')
      }
    } catch {
      addToast('Import failed', 'error')
    }

    setCsvRows(null)
    setImporting(false)
  }

  const dimensions = config?.dimensions ?? []

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </span>

        <form onSubmit={(e) => { void handleAddConstruct(e) }} className="flex items-center gap-2">
          <input
            value={newConstructLabel}
            onChange={(e) => setNewConstructLabel(e.target.value)}
            placeholder="New construct label"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          {newConstructLabel.trim() && (
            <span className="text-xs font-mono text-zinc-400">{toKey(newConstructLabel.trim())}</span>
          )}
          <button
            type="submit"
            disabled={addingConstruct || !newConstructLabel.trim()}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add construct
          </button>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={downloadCSVTemplate}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Download CSV template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Construct sections */}
      {dimensions.length === 0 && (
        <p className="text-sm text-zinc-400">No constructs yet. Add a construct above to get started.</p>
      )}

      {dimensions.map((dim) => {
        const dimQuestions = questions
          .filter((q) => q.dimension === dim.key)
          .sort((a, b) => a.sort_order - b.sort_order)
        const hasQuestions = dimQuestions.length > 0
        const itemCount = dimQuestions.length

        return (
          <section key={dim.key} className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* Section header */}
            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <InlineLabelEditor
                      label={dim.label}
                      onSave={(newLabel) => handleSaveDimensionLabel(dim.key, newLabel)}
                    />
                    <span className="text-xs font-mono text-zinc-400">{dim.key}</span>
                    <span className="text-xs text-zinc-400">
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </span>
                    {itemCount < 3 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        3+ recommended
                      </span>
                    )}
                  </div>
                  <DescriptionEditor
                    description={(dim as ScoringDimension).description}
                    onSave={(desc) => handleSaveDimensionDescription(dim.key, desc)}
                  />
                </div>
                <button
                  onClick={() => { void handleDeleteConstruct(dim.key) }}
                  disabled={hasQuestions}
                  title={hasQuestions ? 'Remove all questions before deleting' : 'Delete construct'}
                  className="mt-0.5 shrink-0 text-zinc-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-600 dark:hover:text-red-400"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Questions */}
            <div className="py-1">
              {dimQuestions.map((q, i) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  index={i}
                  isFirst={i === 0}
                  isLast={i === dimQuestions.length - 1}
                  surveyId={surveyId}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                  onMoveUp={() => handleMoveQuestion(dim.key, i, 'up')}
                  onMoveDown={() => handleMoveQuestion(dim.key, i, 'down')}
                  addToast={addToast}
                />
              ))}
              {dimQuestions.length === 0 && (
                <p className="px-4 py-2 text-xs text-zinc-400 italic">No items yet.</p>
              )}
            </div>

            {/* Add item */}
            <div className="border-t border-zinc-100 py-2 dark:border-zinc-800">
              <AddItemForm
                dimensionKey={dim.key}
                surveyId={surveyId}
                questions={questions}
                onAdded={handleAdded}
                addToast={addToast}
              />
            </div>
          </section>
        )
      })}

      {/* CSV preview modal */}
      {csvRows && (
        <CsvPreviewModal
          rows={csvRows}
          onConfirm={() => { void handleCSVImport() }}
          onCancel={() => setCsvRows(null)}
        />
      )}
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <p className="text-sm text-white">Importing…</p>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
