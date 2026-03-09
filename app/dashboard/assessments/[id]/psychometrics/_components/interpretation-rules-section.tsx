'use client'

import { useState } from 'react'

type Rule = {
  id: string
  assessment_id: string
  target_type: 'trait' | 'dimension' | 'overall'
  target_id: string | null
  rule_type: 'band_text' | 'coaching_tip' | 'risk_flag' | 'recommendation'
  min_percentile: number
  max_percentile: number
  title: string | null
  body: string
  priority: number
  created_at: string
}

type Props = {
  assessmentId: string
  initialRules: Rule[]
}

const RULE_TYPES = ['band_text', 'coaching_tip', 'risk_flag', 'recommendation'] as const
const TARGET_TYPES = ['overall', 'trait', 'dimension'] as const

const RULE_TYPE_LABELS: Record<string, string> = {
  band_text: 'Band text',
  coaching_tip: 'Coaching tip',
  risk_flag: 'Risk flag',
  recommendation: 'Recommendation',
}

const ruleTypeBadgeClass: Record<string, string> = {
  band_text: 'bg-blue-50 text-blue-700',
  coaching_tip: 'bg-green-50 text-green-700',
  risk_flag: 'bg-amber-50 text-amber-700',
  recommendation: 'bg-purple-50 text-purple-700',
}

const DEFAULT_FORM = {
  targetType: 'overall' as 'trait' | 'dimension' | 'overall',
  ruleType: 'band_text' as 'band_text' | 'coaching_tip' | 'risk_flag' | 'recommendation',
  minPercentile: 0,
  maxPercentile: 100,
  title: '',
  body: '',
  priority: 0,
}

export function InterpretationRulesSection({ assessmentId, initialRules }: Props) {
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ ...DEFAULT_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addRule() {
    if (!form.body.trim()) {
      setError('Body is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/interpretation-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: form.targetType,
          ruleType: form.ruleType,
          minPercentile: form.minPercentile,
          maxPercentile: form.maxPercentile,
          title: form.title || null,
          body: form.body,
          priority: form.priority,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setRules((prev) => [...prev, json.rule])
      setForm({ ...DEFAULT_FORM })
      setAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('Delete this interpretation rule?')) return
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/interpretation-rules/${ruleId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
    } catch {
      alert('Failed to delete rule.')
    }
  }

  const byType = new Map<string, Rule[]>()
  for (const rule of rules) {
    const list = byType.get(rule.rule_type) ?? []
    list.push(rule)
    byType.set(rule.rule_type, list)
  }

  return (
    <div className="space-y-4">
      {rules.length === 0 && !adding && (
        <p className="text-sm text-[var(--site-text-muted)]">No interpretation rules configured.</p>
      )}

      {RULE_TYPES.filter((rt) => byType.has(rt)).map((ruleType) => (
        <div key={ruleType}>
          <p className="mb-2 text-xs font-semibold text-[var(--site-text-muted)] uppercase tracking-wide">
            {RULE_TYPE_LABELS[ruleType]}
          </p>
          <div className="space-y-2">
            {(byType.get(ruleType) ?? []).map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ruleTypeBadgeClass[rule.rule_type] ?? ''}`}>
                        {RULE_TYPE_LABELS[rule.rule_type]}
                      </span>
                      <span className="text-xs text-[var(--site-text-muted)]">
                        {rule.target_type} &middot; p{rule.min_percentile}–p{rule.max_percentile}
                      </span>
                    </div>
                    {rule.title && (
                      <p className="mt-1 text-sm font-semibold text-[var(--site-text-primary)]">{rule.title}</p>
                    )}
                    <p className="mt-1 text-sm text-[var(--site-text-body)] line-clamp-2">{rule.body}</p>
                  </div>
                  <button onClick={() => deleteRule(rule.id)} className="shrink-0 text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="backend-label">Target type</label>
              <select
                className="backend-input mt-1"
                value={form.targetType}
                onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value as typeof form.targetType }))}
              >
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="backend-label">Rule type</label>
              <select
                className="backend-input mt-1"
                value={form.ruleType}
                onChange={(e) => setForm((f) => ({ ...f, ruleType: e.target.value as typeof form.ruleType }))}
              >
                {RULE_TYPES.map((t) => (
                  <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="backend-label">Min percentile</label>
              <input
                type="number"
                min={0}
                max={99}
                className="backend-input mt-1"
                value={form.minPercentile}
                onChange={(e) => setForm((f) => ({ ...f, minPercentile: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="backend-label">Max percentile</label>
              <input
                type="number"
                min={1}
                max={100}
                className="backend-input mt-1"
                value={form.maxPercentile}
                onChange={(e) => setForm((f) => ({ ...f, maxPercentile: parseInt(e.target.value) || 100 }))}
              />
            </div>
            <div>
              <label className="backend-label">Priority</label>
              <input
                type="number"
                className="backend-input mt-1"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <label className="backend-label">Title (optional)</label>
            <input
              className="backend-input mt-1"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div>
            <label className="backend-label">Body</label>
            <textarea
              className="backend-input mt-1 min-h-[80px]"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addRule} disabled={saving} className="backend-btn-primary text-sm">
              {saving ? 'Saving...' : 'Add rule'}
            </button>
            <button onClick={() => { setAdding(false); setError(null) }} className="backend-btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="backend-btn-secondary text-sm">
          + Add rule
        </button>
      )}
    </div>
  )
}
