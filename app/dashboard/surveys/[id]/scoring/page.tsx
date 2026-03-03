'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { ScoringConfig, ScoringDimension, ScoringClassification, ScoringCondition } from '@/utils/surveys/types'

type Question = { id: string; question_key: string; text: string }

function toKey(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

// ── Dimension card ──────────────────────────────────────────────────────────
function DimensionCard({
  dim,
  questions,
  onChange,
  onDelete,
}: {
  dim: ScoringDimension
  questions: Question[]
  onChange: (updated: ScoringDimension) => void
  onDelete: () => void
}) {
  function toggle(key: string) {
    const keys = dim.question_keys.includes(key)
      ? dim.question_keys.filter((k) => k !== key)
      : [...dim.question_keys, key]
    onChange({ ...dim, question_keys: keys })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-500">Label</label>
          <input
            value={dim.label}
            onChange={(e) => onChange({ ...dim, label: e.target.value })}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <span className="mt-1 block text-xs font-mono text-zinc-400">{dim.key}</span>
        </div>
        <button
          onClick={() => {
            if (confirm(`Delete dimension "${dim.label}"?`)) onDelete()
          }}
          className="mt-5 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
          title="Delete dimension"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-zinc-500">Questions</p>
        <div className="flex flex-wrap gap-2">
          {questions.map((q) => (
            <label key={q.question_key} className="flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                checked={dim.question_keys.includes(q.question_key)}
                onChange={() => toggle(q.question_key)}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">{q.question_key}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-500">Bands</p>
        <div className="space-y-2">
          {(['high', 'mid', 'low'] as const).map((band) => (
            <div key={band} className="flex items-center gap-3">
              <span className="w-8 text-xs font-medium capitalize text-zinc-500">{band}</span>
              {band !== 'low' && (
                <>
                  <span className="text-xs text-zinc-400">≥</span>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={dim.thresholds[band]}
                    onChange={(e) => onChange({ ...dim, thresholds: { ...dim.thresholds, [band]: Number(e.target.value) } })}
                    className="w-16 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </>
              )}
              {band === 'low' && <span className="text-xs text-zinc-400">otherwise</span>}
              <span className="text-xs text-zinc-400">→</span>
              <input
                value={dim.bands[band]}
                onChange={(e) => onChange({ ...dim, bands: { ...dim.bands, [band]: e.target.value } })}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Classification card ─────────────────────────────────────────────────────
function ClassificationCard({
  cls,
  dimensions,
  onChange,
  onDelete,
}: {
  cls: ScoringClassification
  dimensions: ScoringDimension[]
  onChange: (updated: ScoringClassification) => void
  onDelete: () => void
}) {
  function updateCondition(i: number, patch: Partial<ScoringCondition>) {
    const conditions = cls.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    onChange({ ...cls, conditions })
  }

  function removeCondition(i: number) {
    onChange({ ...cls, conditions: cls.conditions.filter((_, idx) => idx !== i) })
  }

  function addCondition() {
    const dim = dimensions[0]?.key ?? ''
    onChange({ ...cls, conditions: [...cls.conditions, { dimension: dim, operator: '>=', value: 4 }] })
  }

  function updateRec(i: number, value: string) {
    const recommendations = cls.recommendations.map((r, idx) => (idx === i ? value : r))
    onChange({ ...cls, recommendations })
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            value={cls.label}
            onChange={(e) => onChange({ ...cls, label: e.target.value })}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-950"
          />
          <span className="text-xs text-zinc-400 font-mono">{cls.key}</span>
        </div>
        <button
          onClick={() => {
            if (confirm(`Delete classification "${cls.label}"?`)) onDelete()
          }}
          className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"
          title="Delete classification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Conditions */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-medium text-zinc-500">Conditions</p>
        <div className="space-y-2">
          {cls.conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={cond.dimension}
                onChange={(e) => updateCondition(i, { dimension: e.target.value })}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {dimensions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
              <select
                value={cond.operator}
                onChange={(e) => updateCondition(i, { operator: e.target.value as ScoringCondition['operator'] })}
                className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {['>=', '>', '<=', '<', '=', '!='].map((op) => <option key={op}>{op}</option>)}
              </select>
              <input
                type="number"
                step="0.5"
                value={cond.value}
                onChange={(e) => updateCondition(i, { value: Number(e.target.value) })}
                className="w-16 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button onClick={() => removeCondition(i)} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button onClick={addCondition} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            + Add condition
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <p className="mb-2 text-xs font-medium text-zinc-500">Recommendations</p>
        <div className="space-y-2">
          {cls.recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2 text-xs text-zinc-400">{i + 1}.</span>
              <textarea
                value={rec}
                onChange={(e) => updateRec(i, e.target.value)}
                rows={2}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Add dimension form ───────────────────────────────────────────────────────
function AddDimensionForm({ onAdd }: { onAdd: (dim: ScoringDimension) => void }) {
  const [label, setLabel] = useState('')
  function submit() {
    const trimmed = label.trim()
    if (!trimmed) return
    onAdd({
      key: toKey(trimmed),
      label: trimmed,
      question_keys: [],
      thresholds: { high: 4, mid: 3 },
      bands: { high: '', mid: '', low: '' },
    })
    setLabel('')
  }
  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="Dimension label"
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      {label.trim() && (
        <span className="text-xs font-mono text-zinc-400">{toKey(label.trim())}</span>
      )}
      <button
        onClick={submit}
        disabled={!label.trim()}
        className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Add dimension
      </button>
    </div>
  )
}

// ── Add classification form ──────────────────────────────────────────────────
function AddClassificationForm({ onAdd }: { onAdd: (cls: ScoringClassification) => void }) {
  const [label, setLabel] = useState('')
  function submit() {
    const trimmed = label.trim()
    if (!trimmed) return
    onAdd({
      key: toKey(trimmed),
      label: trimmed,
      conditions: [],
      recommendations: [],
    })
    setLabel('')
  }
  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="Classification label"
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
      />
      {label.trim() && (
        <span className="text-xs font-mono text-zinc-400">{toKey(label.trim())}</span>
      )}
      <button
        onClick={submit}
        disabled={!label.trim()}
        className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Add classification
      </button>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function SurveyScoringPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id
  const [config, setConfig] = useState<ScoringConfig | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [sRes, qRes] = await Promise.all([
        fetch(`/api/admin/surveys/${surveyId}/scoring`, { cache: 'no-store' }),
        fetch(`/api/admin/surveys/${surveyId}/questions`, { cache: 'no-store' }),
      ])
      const sBody = (await sRes.json()) as { scoringConfig?: ScoringConfig }
      const qBody = (await qRes.json()) as { questions?: Question[] }
      setConfig(sBody.scoringConfig ?? { dimensions: [], classifications: [] })
      setQuestions(qBody.questions ?? [])
    }
    void load()
  }, [surveyId])

  function updateDimension(i: number, updated: ScoringDimension) {
    if (!config) return
    setConfig({ ...config, dimensions: config.dimensions.map((d, idx) => (idx === i ? updated : d)) })
  }

  function deleteDimension(i: number) {
    if (!config) return
    setConfig({ ...config, dimensions: config.dimensions.filter((_, idx) => idx !== i) })
  }

  function addDimension(dim: ScoringDimension) {
    if (!config) return
    setConfig({ ...config, dimensions: [...config.dimensions, dim] })
  }

  function updateClassification(i: number, updated: ScoringClassification) {
    if (!config) return
    setConfig({ ...config, classifications: config.classifications.map((c, idx) => (idx === i ? updated : c)) })
  }

  function deleteClassification(i: number) {
    if (!config) return
    setConfig({ ...config, classifications: config.classifications.filter((_, idx) => idx !== i) })
  }

  function addClassification(cls: ScoringClassification) {
    if (!config) return
    setConfig({ ...config, classifications: [...config.classifications, cls] })
  }

  async function handleSave() {
    if (!config) return
    setSaving(true)
    setStatus(null)
    const res = await fetch(`/api/admin/surveys/${surveyId}/scoring`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoringConfig: config }),
    })
    setStatus(res.ok ? 'Saved' : 'Save failed')
    setSaving(false)
  }

  if (!config) return <p className="text-sm text-zinc-400">Loading…</p>

  return (
    <div className="space-y-8">
      {/* Dimensions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Dimensions</h2>
        <div className="space-y-4">
          {config.dimensions.map((dim, i) => (
            <DimensionCard
              key={dim.key}
              dim={dim}
              questions={questions}
              onChange={(updated) => updateDimension(i, updated)}
              onDelete={() => deleteDimension(i)}
            />
          ))}
        </div>
        <AddDimensionForm onAdd={addDimension} />
      </section>

      {/* Classifications */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Classifications</h2>
        <div className="space-y-4">
          {config.classifications.map((cls, i) => (
            <ClassificationCard
              key={cls.key}
              cls={cls}
              dimensions={config.dimensions}
              onChange={(updated) => updateClassification(i, updated)}
              onDelete={() => deleteClassification(i)}
            />
          ))}
        </div>
        <AddClassificationForm onAdd={addClassification} />
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? 'Saving…' : 'Save scoring config'}
        </button>
        {status && <p className="text-sm text-zinc-500">{status}</p>}
      </div>
    </div>
  )
}
