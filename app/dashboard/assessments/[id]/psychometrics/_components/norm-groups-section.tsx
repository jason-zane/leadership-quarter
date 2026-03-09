'use client'

import { useState } from 'react'

type NormStat = {
  id: string
  norm_group_id: string
  trait_id: string
  mean: number
  sd: number
  computed_at: string
  assessment_traits: { code: string; name: string } | { code: string; name: string }[] | null
}

type NormGroup = {
  id: string
  assessment_id: string
  name: string
  description: string | null
  n: number
  is_global: boolean
  created_at: string
  updated_at: string
  norm_stats: NormStat[]
}

type Props = {
  assessmentId: string
  initialNormGroups: NormGroup[]
}

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function NormGroupsSection({ assessmentId, initialNormGroups }: Props) {
  const [groups, setGroups] = useState<NormGroup[]>(initialNormGroups)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIsGlobal, setNewIsGlobal] = useState(true)
  const [saving, setSaving] = useState(false)
  const [computing, setComputing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function addGroup() {
    if (!newName.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, isGlobal: newIsGlobal }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setGroups((prev) => [...prev, { ...json.normGroup, norm_stats: [] }])
      setNewName('')
      setAdding(false)
    } catch {
      setError('Failed to create norm group.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Delete this norm group and all its stats?')) return
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups/${groupId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
    } catch {
      alert('Failed to delete norm group.')
    }
  }

  async function computeNorms(groupId: string) {
    setComputing(groupId)
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups/${groupId}/compute`, { method: 'POST' })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      alert(`Computed norms for ${json.traitsComputed} trait(s) from ${json.n} session(s). ${json.sessionsUpdated} session(s) re-scored.`)
      // Refresh group list
      const listRes = await fetch(`/api/admin/assessments/${assessmentId}/norm-groups`)
      const listJson = await listRes.json()
      if (listJson.ok) setGroups(listJson.normGroups)
    } catch {
      alert('Failed to compute norms.')
    } finally {
      setComputing(null)
    }
  }

  return (
    <div className="space-y-3">
      {groups.length === 0 && !adding && (
        <p className="text-sm text-[var(--site-text-muted)]">No norm groups configured.</p>
      )}

      {groups.map((group) => {
        const latestStat = group.norm_stats[0] ?? null
        const computedAt = latestStat?.computed_at ?? null

        return (
          <div key={group.id} className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--site-text-primary)]">
                  {group.name}
                  {group.is_global && (
                    <span className="ml-2 rounded bg-[var(--site-surface-tint)] px-1.5 py-0.5 text-[10px] text-[var(--site-text-muted)]">
                      Global
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--site-text-muted)]">
                  n={group.n} &middot; {group.norm_stats.length} trait(s) with stats
                  {computedAt ? ` &middot; computed ${formatDate(computedAt)}` : ' &middot; not yet computed'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => computeNorms(group.id)}
                  disabled={computing === group.id}
                  className="backend-btn-secondary text-xs"
                >
                  {computing === group.id ? 'Computing...' : 'Compute from submissions'}
                </button>
                <button onClick={() => deleteGroup(group.id)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>

            {group.norm_stats.length > 0 && (
              <div className="mt-3 space-y-1">
                {group.norm_stats.map((stat) => {
                  const trait = pickOne(stat.assessment_traits)
                  return (
                    <div key={stat.id} className="flex items-center gap-4 text-xs text-[var(--site-text-body)]">
                      <span className="w-32 font-mono truncate">{trait?.code ?? stat.trait_id}</span>
                      <span>mean {stat.mean.toFixed(2)}</span>
                      <span>sd {stat.sd.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {adding ? (
        <div className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4 space-y-3">
          <div>
            <label className="backend-label">Name</label>
            <input
              className="backend-input mt-1"
              placeholder="e.g. All participants"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--site-text-body)]">
            <input
              type="checkbox"
              checked={newIsGlobal}
              onChange={(e) => setNewIsGlobal(e.target.checked)}
              className="accent-[var(--site-accent-strong)]"
            />
            Global norm group (applies to all participants)
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={addGroup} disabled={saving} className="backend-btn-primary text-sm">
              {saving ? 'Saving...' : 'Add norm group'}
            </button>
            <button onClick={() => { setAdding(false); setError(null) }} className="backend-btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="backend-btn-secondary text-sm">
          + Add norm group
        </button>
      )}
    </div>
  )
}
