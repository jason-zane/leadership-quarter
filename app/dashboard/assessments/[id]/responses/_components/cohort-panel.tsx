'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  computeAverageScores,
  computeClassificationDist,
  exportCohortCsv,
  formatShortDate,
  type Cohort,
  type Submission,
} from '../_lib/responses-page'

export function CohortPanel({
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

  const fetchCohorts = useCallback(async () => {
    const response = await fetch(`/api/admin/assessments/${assessmentId}/response-cohorts`, {
      cache: 'no-store',
    })
    const body = (await response.json()) as { cohorts?: Cohort[] }
    return body.cohorts ?? []
  }, [assessmentId])

  async function refreshCohorts() {
    const nextCohorts = await fetchCohorts()
    setCohorts(nextCohorts)
    setLoading(false)
  }

  useEffect(() => {
    let active = true

    void fetchCohorts().then((nextCohorts) => {
      if (!active) return
      setCohorts(nextCohorts)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [fetchCohorts])

  async function saveCohort() {
    const name = savingName.trim()
    if (!name) return
    if (selectedIds.size === 0) {
      setSaveError('Select at least one respondent before saving a cohort.')
      return
    }

    setSaving(true)
    setSaveError(null)
    const response = await fetch(`/api/admin/assessments/${assessmentId}/response-cohorts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, submissionIds: [...selectedIds] }),
    })
    const body = (await response.json()) as { ok?: boolean; error?: string }
    setSaving(false)
    if (!response.ok || !body.ok) {
      setSaveError(body.error ?? 'Failed to save cohort.')
      return
    }

    setSavingName('')
    await refreshCohorts()
  }

  async function deleteCohort(id: string) {
    setDeletingId(id)
    await fetch(`/api/admin/response-cohorts/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    await refreshCohorts()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Response cohorts</h3>
        <p className="mt-0.5 text-xs text-zinc-500">
          Save a named group of respondents to compare averaged scores and classification distributions.
        </p>
      </div>

      {selectedIds.size > 0 && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
          <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {selectedIds.size} respondent{selectedIds.size !== 1 ? 's' : ''} selected - save as cohort
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cohort name"
              value={savingName}
              onChange={(event) => setSavingName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void saveCohort()
              }}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              onClick={() => {
                void saveCohort()
              }}
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
        <div className="px-5 py-6 text-sm text-zinc-400">
          No cohorts saved. Select respondents above and save a cohort.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {cohorts.map((cohort) => {
            const members = rows.filter((row) => cohort.submission_ids.includes(row.id))
            const averageScores = computeAverageScores(members)
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
                      className={[
                        'h-3.5 w-3.5 text-zinc-400 transition-transform',
                        isExpanded ? 'rotate-90' : '',
                      ].join(' ')}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {cohort.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {members.length} member{members.length !== 1 ? 's' : ''}
                    </span>
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
                      onClick={() => {
                        void deleteCohort(cohort.id)
                      }}
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
                      <p className="text-xs text-zinc-400">
                        None of the saved respondents appear in the current response list.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Average scores
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {Object.entries(averageScores).map(([key, avg]) => (
                              <span key={key} className="rounded-md bg-white px-2.5 py-1.5 text-xs dark:bg-zinc-900">
                                <span className="text-zinc-400">{key}: </span>
                                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                                  {avg.toFixed(2)}
                                </span>
                              </span>
                            ))}
                            {Object.keys(averageScores).length === 0 && (
                              <span className="text-xs text-zinc-400">No scores available</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Classification distribution
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(classDist).map(([label, count]) => (
                              <span key={label} className="rounded-full bg-white px-2.5 py-0.5 text-xs dark:bg-zinc-900">
                                {label}{' '}
                                <span className="font-medium text-zinc-600 dark:text-zinc-300">({count})</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                            Members
                          </p>
                          <ul className="space-y-1">
                            {members.map((member) => (
                              <li
                                key={member.id}
                                className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                              >
                                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {[member.first_name, member.last_name].filter(Boolean).join(' ') || '-'}
                                </span>
                                {member.organisation ? <span>- {member.organisation}</span> : null}
                                <span className="text-zinc-400">- {formatShortDate(member.created_at)}</span>
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
