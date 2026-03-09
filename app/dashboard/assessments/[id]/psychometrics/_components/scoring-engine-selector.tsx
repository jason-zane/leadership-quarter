'use client'

import { useState } from 'react'

type ScoringEngine = 'rule_based' | 'psychometric' | 'hybrid'

type Props = {
  assessmentId: string
  current: ScoringEngine
}

const OPTIONS: { value: ScoringEngine; label: string; description: string }[] = [
  {
    value: 'rule_based',
    label: 'Rule-based',
    description: 'Classifications are determined by dimension band combinations defined in Scoring.',
  },
  {
    value: 'psychometric',
    label: 'Psychometric',
    description: 'Scores are computed from trait norms, producing percentile ranks and z-scores.',
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Both engines run; rule-based classification is shown alongside psychometric trait scores.',
  },
]

export function ScoringEngineSelector({ assessmentId, current }: Props) {
  const [value, setValue] = useState<ScoringEngine>(current)
  const [saving, setSaving] = useState(false)
  const [savedValue, setSavedValue] = useState<ScoringEngine>(current)
  const [error, setError] = useState<string | null>(null)

  async function save(next: ScoringEngine) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoringEngine: next }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setValue(next)
      setSavedValue(next)
    } catch {
      setError('Failed to save scoring engine. Please try again.')
      setValue(savedValue)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={[
              'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
              value === opt.value
                ? 'border-[var(--site-accent-strong)] bg-[var(--site-surface-tint)]'
                : 'border-[var(--site-border)] bg-[var(--site-surface-elevated)] hover:border-[var(--site-border-strong)]',
            ].join(' ')}
          >
            <input
              type="radio"
              name="scoring-engine"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => {
                setValue(opt.value)
                save(opt.value)
              }}
              disabled={saving}
              className="mt-0.5 accent-[var(--site-accent-strong)]"
            />
            <div>
              <p className="text-sm font-semibold text-[var(--site-text-primary)]">{opt.label}</p>
              <p className="mt-0.5 text-sm text-[var(--site-text-body)]">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>
      {saving && <p className="text-xs text-[var(--site-text-muted)]">Saving...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
