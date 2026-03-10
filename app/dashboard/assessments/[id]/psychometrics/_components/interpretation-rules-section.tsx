'use client'

import { useState } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { ActionMenu } from '@/components/ui/action-menu'

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

type FormState = {
  targetType: 'trait' | 'dimension' | 'overall'
  ruleType: 'band_text' | 'coaching_tip' | 'risk_flag' | 'recommendation'
  minPercentile: number
  maxPercentile: number
  title: string
  body: string
  priority: number
}

const DEFAULT_FORM: FormState = {
  targetType: 'overall',
  ruleType: 'band_text',
  minPercentile: 0,
  maxPercentile: 100,
  title: '',
  body: '',
  priority: 0,
}

function ruleToForm(rule: Rule): FormState {
  return {
    targetType: rule.target_type,
    ruleType: rule.rule_type,
    minPercentile: rule.min_percentile,
    maxPercentile: rule.max_percentile,
    title: rule.title ?? '',
    body: rule.body,
    priority: rule.priority,
  }
}

function RuleForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error,
  submitLabel,
}: {
  form: FormState
  onChange: (next: FormState) => void
  onSubmit: () => void
  onCancel: () => void
  saving: boolean
  error: string | null
  submitLabel: string
}) {
  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="backend-label">Target type</label>
          <select
            className="foundation-field mt-1"
            value={form.targetType}
            onChange={(e) => onChange({ ...form, targetType: e.target.value as FormState['targetType'] })}
          >
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="backend-label">Rule type</label>
          <select
            className="foundation-field mt-1"
            value={form.ruleType}
            onChange={(e) => onChange({ ...form, ruleType: e.target.value as FormState['ruleType'] })}
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
            className="foundation-field mt-1"
            value={form.minPercentile}
            onChange={(e) => onChange({ ...form, minPercentile: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="backend-label">Max percentile</label>
          <input
            type="number"
            min={1}
            max={100}
            className="foundation-field mt-1"
            value={form.maxPercentile}
            onChange={(e) => onChange({ ...form, maxPercentile: parseInt(e.target.value) || 100 })}
          />
        </div>
        <div>
          <label className="backend-label">Priority</label>
          <input
            type="number"
            className="foundation-field mt-1"
            value={form.priority}
            onChange={(e) => onChange({ ...form, priority: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <label className="backend-label">Title (optional)</label>
        <input
          className="foundation-field mt-1"
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
        />
      </div>

      <div>
        <label className="backend-label">Body</label>
        <textarea
          className="foundation-field mt-1 min-h-[80px]"
          value={form.body}
          onChange={(e) => onChange({ ...form, body: e.target.value })}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <FoundationButton variant="primary" size="sm" onClick={onSubmit} disabled={saving}>
          {saving ? 'Saving...' : submitLabel}
        </FoundationButton>
        <FoundationButton variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </FoundationButton>
      </div>
    </div>
  )
}

export function InterpretationRulesSection({ assessmentId, initialRules }: Props) {
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<FormState>({ ...DEFAULT_FORM })
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>({ ...DEFAULT_FORM })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  async function addRule() {
    if (!addForm.body.trim()) {
      setAddError('Body is required.')
      return
    }
    setAddSaving(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/interpretation-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: addForm.targetType,
          ruleType: addForm.ruleType,
          minPercentile: addForm.minPercentile,
          maxPercentile: addForm.maxPercentile,
          title: addForm.title || null,
          body: addForm.body,
          priority: addForm.priority,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setRules((prev) => [...prev, json.rule])
      setAddForm({ ...DEFAULT_FORM })
      setAdding(false)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create rule.')
    } finally {
      setAddSaving(false)
    }
  }

  function startEdit(rule: Rule) {
    setEditingId(rule.id)
    setEditForm(ruleToForm(rule))
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditError(null)
  }

  async function saveEdit(ruleId: string) {
    if (!editForm.body.trim()) {
      setEditError('Body is required.')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/interpretation-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: editForm.targetType,
          ruleType: editForm.ruleType,
          minPercentile: editForm.minPercentile,
          maxPercentile: editForm.maxPercentile,
          title: editForm.title || null,
          body: editForm.body,
          priority: editForm.priority,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, ...json.rule } : r)))
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save rule.')
    } finally {
      setEditSaving(false)
    }
  }

  async function deleteRule(ruleId: string) {
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/interpretation-rules/${ruleId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      setConfirmingDeleteId(null)
    } catch {
      setConfirmingDeleteId(null)
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

                    {editingId === rule.id && (
                      <RuleForm
                        form={editForm}
                        onChange={setEditForm}
                        onSubmit={() => { void saveEdit(rule.id) }}
                        onCancel={cancelEdit}
                        saving={editSaving}
                        error={editError}
                        submitLabel="Save rule"
                      />
                    )}
                  </div>

                  {confirmingDeleteId === rule.id ? (
                    <div className="flex gap-2 shrink-0">
                      <FoundationButton variant="danger" size="sm" onClick={() => { void deleteRule(rule.id) }}>
                        Confirm
                      </FoundationButton>
                      <FoundationButton variant="secondary" size="sm" onClick={() => setConfirmingDeleteId(null)}>
                        Cancel
                      </FoundationButton>
                    </div>
                  ) : (
                    <ActionMenu
                      items={[
                        { type: 'item', label: 'Edit', onSelect: () => startEdit(rule) },
                        { type: 'separator' },
                        { type: 'item', label: 'Delete', onSelect: () => setConfirmingDeleteId(rule.id), destructive: true },
                      ]}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {adding ? (
        <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4 space-y-3">
          <RuleForm
            form={addForm}
            onChange={setAddForm}
            onSubmit={() => { void addRule() }}
            onCancel={() => { setAdding(false); setAddError(null) }}
            saving={addSaving}
            error={addError}
            submitLabel="Add rule"
          />
        </div>
      ) : (
        <FoundationButton variant="secondary" size="sm" onClick={() => setAdding(true)}>
          + Add rule
        </FoundationButton>
      )}
    </div>
  )
}
