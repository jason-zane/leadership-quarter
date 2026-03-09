'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CohortPanel } from './_components/cohort-panel'
import { ResponsesTable } from './_components/responses-table'
import { ResponsesToolbar } from './_components/responses-toolbar'
import type { Submission } from './_lib/responses-page'

export default function SurveyResponsesPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id

  const [rows, setRows] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [cohortsOpen, setCohortsOpen] = useState(false)

  useEffect(() => {
    async function loadResponses() {
      const response = await fetch(`/api/admin/assessments/${surveyId}/responses`, { cache: 'no-store' })
      const body = (await response.json()) as { responses?: Submission[] }
      setRows(body.responses ?? [])
      setLoading(false)
    }

    void loadResponses()
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
      return
    }

    setSelectedIds(new Set(rows.map((row) => row.id)))
  }

  function toggleSelectMode() {
    setSelectMode((current) => {
      const next = !current
      if (!next) {
        setSelectedIds(new Set())
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      <ResponsesToolbar
        rows={rows}
        selectMode={selectMode}
        selectedCount={selectedIds.size}
        onToggleSelectMode={toggleSelectMode}
        onOpenCohorts={() => setCohortsOpen(true)}
      />

      <ResponsesTable
        surveyId={surveyId}
        rows={rows}
        loading={loading}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
      />

      <div>
        <button
          onClick={() => setCohortsOpen((current) => !current)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg
            className={['h-4 w-4 transition-transform', cohortsOpen ? 'rotate-90' : ''].join(' ')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
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
