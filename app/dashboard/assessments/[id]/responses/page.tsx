'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Submission = {
  id: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  scores: Record<string, number>
  bands: Record<string, string>
  classification: { key?: string; label?: string } | null
  created_at: string
}

type Cohort = {
  id: string
  name: string
  submission_ids: string[]
  created_at: string
}

const classificationColors: Record<string, string> = {
  ai_ready_operator: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  naive_enthusiast: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cautious_traditionalist: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  eager_but_underdeveloped: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ai_resistant: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  developing_operator: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

function ScorePill({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined) return <span className="text-zinc-400">—</span>
  return (
    <span className="font-mono text-xs">
      <span className="text-zinc-400">{label[0]}</span>{value.toFixed(1)}
    </span>
  )
}

function exportCsv(rows: Submission[]) {
  const header = ['Name', 'Organisation', 'Classification', 'Openness', 'Risk Posture', 'Capability', 'Date']
  const lines = rows.map((r) => [
    [r.first_name, r.last_name].filter(Boolean).join(' ') || '',
    r.organisation ?? '',
    r.classification?.label ?? '',
    r.scores?.openness?.toFixed(2) ?? '',
    r.scores?.riskPosture?.toFixed(2) ?? '',
    r.scores?.capability?.toFixed(2) ?? '',
    new Date(r.created_at).toLocaleDateString('en-AU'),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'responses.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function computeAverageScores(members: Submission[]): Record<string, number> {
  if (members.length === 0) return {}
  const keys = [...new Set(members.flatMap((m) => Object.keys(m.scores ?? {})))]
  const result: Record<string, number> = {}
  for (const key of keys) {
    const values = members.map((m) => m.scores?.[key]).filter((v): v is number => typeof v === 'number')
    if (values.length > 0) {
      result[key] = values.reduce((sum, v) => sum + v, 0) / values.length
    }
  }
  return result
}

function computeClassificationDist(members: Submission[]): Record<string, number> {
  const dist: Record<string, number> = {}
  for (const m of members) {
    const label = m.classification?.label ?? 'Unknown'
    dist[label] = (dist[label] ?? 0) + 1
  }
  return dist
}

function exportCohortCsv(cohortName: string, members: Submission[]) {
  const avgScores = computeAverageScores(members)
  const header = ['Name', 'Organisation', 'Classification', 'Openness', 'Risk Posture', 'Capability', 'Date']
  const memberLines = members.map((r) => [
    [r.first_name, r.last_name].filter(Boolean).join(' ') || '',
    r.organisation ?? '',
    r.classification?.label ?? '',
    r.scores?.openness?.toFixed(2) ?? '',
    r.scores?.riskPosture?.toFixed(2) ?? '',
    r.scores?.capability?.toFixed(2) ?? '',
    new Date(r.created_at).toLocaleDateString('en-AU'),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const avgLine = [
    'Average',
    '',
    '',
    avgScores.openness?.toFixed(2) ?? '',
    avgScores.riskPosture?.toFixed(2) ?? '',
    avgScores.capability?.toFixed(2) ?? '',
    '',
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')

  const blob = new Blob([[header.join(','), ...memberLines, avgLine].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cohort-${cohortName.replace(/\s+/g, '-').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function CohortPanel({
  assessmentId,
  rows,
  selectedIds,
}: {
  assessmentId: string
  rows: Submission[]
  selectedIds: Set<string>
}) {
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [loading, setLoading] = useState(true)
  const [savingName, setSavingName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadCohorts() {
    const res = await fetch(`/api/admin/assessments/${assessmentId}/response-cohorts`, { cache: 'no-store' })
    const body = (await res.json()) as { cohorts?: Cohort[] }
    setCohorts(body.cohorts ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void loadCohorts()
  }, [assessmentId])

  async function saveCohort() {
    const name = savingName.trim()
    if (!name) return
    if (selectedIds.size === 0) {
      setSaveError('Select at least one respondent before saving a cohort.')
      return
    }
    setSaving(true)
    setSaveError(null)
    const res = await fetch(`/api/admin/assessments/${assessmentId}/response-cohorts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, submissionIds: [...selectedIds] }),
    })
    const body = (await res.json()) as { ok?: boolean; error?: string }
    setSaving(false)
    if (!res.ok || !body.ok) {
      setSaveError(body.error ?? 'Failed to save cohort.')
      return
    }
    setSavingName('')
    await loadCohorts()
  }

  async function deleteCohort(id: string) {
    setDeletingId(id)
    await fetch(`/api/admin/response-cohorts/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    await loadCohorts()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Response cohorts</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Save a named group of respondents to compare averaged scores and classification distributions.</p>
      </div>

      {selectedIds.size > 0 && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">{selectedIds.size} respondent{selectedIds.size !== 1 ? 's' : ''} selected — save as cohort</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cohort name"
              value={savingName}
              onChange={(e) => setSavingName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void saveCohort() }}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              onClick={() => void saveCohort()}
              disabled={saving || !savingName.trim()}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saving ? 'Saving...' : 'Save cohort'}
            </button>
          </div>
          {saveError ? <p className="mt-1.5 text-xs text-red-600">{saveError}</p> : null}
        </div>
      )}

      {loading ? (
        <div className="px-5 py-6 text-sm text-zinc-400">Loading cohorts...</div>
      ) : cohorts.length === 0 ? (
        <div className="px-5 py-6 text-sm text-zinc-400">No cohorts saved. Select respondents above and save a cohort.</div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {cohorts.map((cohort) => {
            const members = rows.filter((r) => (cohort.submission_ids as unknown as string[]).includes(r.id))
            const avgScores = computeAverageScores(members)
            const classDist = computeClassificationDist(members)
            const isExpanded = expandedId === cohort.id

            return (
              <li key={cohort.id}>
                <div className="flex items-center justify-between px-5 py-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : cohort.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    <svg
                      className={['h-3.5 w-3.5 text-zinc-400 transition-transform', isExpanded ? 'rotate-90' : ''].join(' ')}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{cohort.name}</span>
                    <span className="text-xs text-zinc-500">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportCohortCsv(cohort.name, members)}
                      disabled={members.length === 0}
                      className="rounded border border-zinc-300 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => void deleteCohort(cohort.id)}
                      disabled={deletingId === cohort.id}
                      className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-800/30">
                    {members.length === 0 ? (
                      <p className="text-xs text-zinc-400">None of the saved respondents appear in the current response list.</p>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Average scores</p>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(avgScores).map(([key, avg]) => (
                              <span key={key} className="rounded-md bg-white px-2.5 py-1.5 text-xs dark:bg-zinc-900">
                                <span className="text-zinc-400">{key}: </span>
                                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{avg.toFixed(2)}</span>
                              </span>
                            ))}
                            {Object.keys(avgScores).length === 0 && <span className="text-xs text-zinc-400">No scores available</span>}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Classification distribution</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(classDist).map(([label, count]) => (
                              <span key={label} className="rounded-full bg-white px-2.5 py-0.5 text-xs dark:bg-zinc-900">
                                {label} <span className="font-medium text-zinc-600 dark:text-zinc-300">({count})</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">Members</p>
                          <ul className="space-y-1">
                            {members.map((m) => (
                              <li key={m.id} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {[m.first_name, m.last_name].filter(Boolean).join(' ') || '—'}
                                </span>
                                {m.organisation ? <span>· {m.organisation}</span> : null}
                                <span className="text-zinc-400">· {new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(m.created_at))}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function SurveyResponsesPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id
  const [rows, setRows] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [cohortsOpen, setCohortsOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/assessments/${surveyId}/responses`, { cache: 'no-store' })
      const body = (await res.json()) as { responses?: Submission[] }
      setRows(body.responses ?? [])
      setLoading(false)
    }
    void load()
  }, [surveyId])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === rows.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(rows.map((r) => r.id)))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{rows.length} response{rows.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectMode((v) => !v)
              if (selectMode) setSelectedIds(new Set())
            }}
            className={[
              'rounded-md border px-3 py-2 text-sm font-medium',
              selectMode
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
            ].join(' ')}
          >
            {selectMode ? `Selecting (${selectedIds.size})` : 'Select'}
          </button>
          {selectMode && selectedIds.size > 0 && (
            <button
              onClick={() => setCohortsOpen(true)}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Save as cohort
            </button>
          )}
          <button
            onClick={() => exportCsv(rows)}
            disabled={rows.length === 0}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              {selectMode && (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  />
                </th>
              )}
              <th className="px-4 py-3 font-medium">Classification</th>
              <th className="px-4 py-3 font-medium">Respondent</th>
              <th className="px-4 py-3 font-medium">Organisation</th>
              <th className="px-4 py-3 font-medium">Scores (O / R / C)</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={selectMode ? 6 : 5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={selectMode ? 6 : 5} className="px-4 py-8 text-center text-sm text-zinc-400">No responses yet.</td></tr>
            ) : (
              rows.map((row) => {
                const key = row.classification?.key ?? ''
                const label = row.classification?.label ?? 'Unknown'
                const colorClass = classificationColors[key] ?? classificationColors.developing_operator
                const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—'
                const isSelected = selectedIds.has(row.id)
                return (
                  <tr
                    key={row.id}
                    className={['border-t border-zinc-100 dark:border-zinc-800', isSelected ? 'bg-zinc-50 dark:bg-zinc-800/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'].join(' ')}
                    onClick={selectMode ? () => toggleSelect(row.id) : undefined}
                    style={selectMode ? { cursor: 'pointer' } : undefined}
                  >
                    {selectMode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(row.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/assessments/${surveyId}/responses/${row.id}`} onClick={(e) => selectMode && e.preventDefault()}>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
                          {label}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.organisation ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ScorePill label="O" value={row.scores?.openness} />
                        <span className="text-zinc-300">/</span>
                        <ScorePill label="R" value={row.scores?.riskPosture} />
                        <span className="text-zinc-300">/</span>
                        <ScorePill label="C" value={row.scores?.capability} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(row.created_at))}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div>
        <button
          onClick={() => setCohortsOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg
            className={['h-4 w-4 transition-transform', cohortsOpen ? 'rotate-90' : ''].join(' ')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Saved cohorts
        </button>

        {cohortsOpen && (
          <div className="mt-3">
            <CohortPanel assessmentId={surveyId} rows={rows} selectedIds={selectedIds} />
          </div>
        )}
      </div>
    </div>
  )
}
