'use client'

import { useState } from 'react'

type Question = {
  id: string
  question_key: string
  text: string
  sort_order: number
}

type Mapping = {
  id?: string
  trait_id?: string
  question_id: string
  weight: number
  reverse_scored: boolean
}

type Props = {
  assessmentId: string
  traitId: string
  allQuestions: Question[]
  initialMappings: Mapping[]
}

export function MappingsPanel({ assessmentId, traitId, allQuestions, initialMappings }: Props) {
  const [selected, setSelected] = useState<Map<string, { weight: number; reverseScored: boolean }>>(
    () => {
      const m = new Map<string, { weight: number; reverseScored: boolean }>()
      for (const mapping of initialMappings) {
        m.set(mapping.question_id, { weight: mapping.weight, reverseScored: mapping.reverse_scored })
      }
      return m
    }
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(questionId: string) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
      } else {
        next.set(questionId, { weight: 1, reverseScored: false })
      }
      return next
    })
    setSaved(false)
  }

  function setWeight(questionId: string, weight: number) {
    setSelected((prev) => {
      const next = new Map(prev)
      const entry = next.get(questionId)
      if (entry) next.set(questionId, { ...entry, weight })
      return next
    })
    setSaved(false)
  }

  function setReverse(questionId: string, reverseScored: boolean) {
    setSelected((prev) => {
      const next = new Map(prev)
      const entry = next.get(questionId)
      if (entry) next.set(questionId, { ...entry, reverseScored })
      return next
    })
    setSaved(false)
  }

  async function saveMappings() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const mappings = Array.from(selected.entries()).map(([questionId, opts]) => ({
        questionId,
        weight: opts.weight,
        reverseScored: opts.reverseScored,
      }))
      const res = await fetch(`/api/admin/assessments/${assessmentId}/traits/${traitId}/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setSaved(true)
    } catch {
      setError('Failed to save mappings.')
    } finally {
      setSaving(false)
    }
  }

  const sortedQuestions = [...allQuestions].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-[var(--site-text-muted)] uppercase tracking-wide">
        Question mappings
      </p>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {sortedQuestions.map((q) => {
          const isSelected = selected.has(q.id)
          const opts = selected.get(q.id)

          return (
            <div
              key={q.id}
              className={[
                'rounded border px-3 py-2 text-sm transition-colors',
                isSelected
                  ? 'border-[var(--site-accent-strong)] bg-[var(--site-surface-tint)]'
                  : 'border-[var(--site-border)] bg-[var(--site-surface)]',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(q.id)}
                  className="mt-0.5 accent-[var(--site-accent-strong)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--site-text-primary)] leading-snug">{q.text}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--site-text-muted)]">{q.question_key}</p>
                </div>
              </div>

              {isSelected && opts && (
                <div className="mt-2 ml-6 flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--site-text-body)]">
                    Weight
                    <input
                      type="number"
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={opts.weight}
                      onChange={(e) => setWeight(q.id, parseFloat(e.target.value) || 1)}
                      className="w-16 rounded border border-[var(--site-border)] px-1.5 py-0.5 text-xs"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--site-text-body)]">
                    <input
                      type="checkbox"
                      checked={opts.reverseScored}
                      onChange={(e) => setReverse(q.id, e.target.checked)}
                      className="accent-[var(--site-accent-strong)]"
                    />
                    Reverse scored
                  </label>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={saveMappings} disabled={saving} className="backend-btn-primary text-sm">
          {saving ? 'Saving...' : 'Save mappings'}
        </button>
        {saved && <span className="text-xs text-green-700">Saved</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
