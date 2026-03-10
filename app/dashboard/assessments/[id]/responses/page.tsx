'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
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
  const [busySubmissionId, setBusySubmissionId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

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

  async function updateAnalysisState(submissionId: string, excludedFromAnalysis: boolean) {
    setBusySubmissionId(submissionId)
    try {
      const response = await fetch(`/api/admin/assessments/${surveyId}/responses/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedFromAnalysis }),
      })
      const body = (await response.json()) as {
        ok?: boolean
        submission?: Pick<
          Submission,
          'id' | 'excluded_from_analysis' | 'excluded_from_analysis_at' | 'excluded_from_analysis_reason'
        >
        error?: string
      }

      if (!response.ok || !body.ok || !body.submission) {
        throw new Error(body.error ?? 'response_update_failed')
      }

      setRows((current) =>
        current.map((row) =>
          row.id === submissionId
            ? {
                ...row,
                excluded_from_analysis: body.submission?.excluded_from_analysis ?? excludedFromAnalysis,
                excluded_from_analysis_at: body.submission?.excluded_from_analysis_at ?? null,
                excluded_from_analysis_reason: body.submission?.excluded_from_analysis_reason ?? null,
              }
            : row
        )
      )

      toast.success(
        excludedFromAnalysis
          ? 'Response will now be ignored by psychometric analysis.'
          : 'Response is back in psychometric analysis.'
      )
    } catch {
      toast.error('Could not update the analysis status for this response.')
    } finally {
      setBusySubmissionId(null)
    }
  }

  async function deleteSubmission(submissionId: string) {
    const row = rows.find((item) => item.id === submissionId)
    const label = row ? [row.first_name, row.last_name].filter(Boolean).join(' ') || 'this response' : 'this response'

    if (!window.confirm(`Delete ${label}? This permanently removes the submission and its scored psychometric rows.`)) {
      return
    }

    setBusySubmissionId(submissionId)
    try {
      const response = await fetch(`/api/admin/assessments/${surveyId}/responses/${submissionId}`, {
        method: 'DELETE',
      })
      const body = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'response_delete_failed')
      }

      setRows((current) => current.filter((item) => item.id !== submissionId))
      setSelectedIds((current) => {
        const next = new Set(current)
        next.delete(submissionId)
        return next
      })
      toast.success('Response deleted.')
    } catch {
      toast.error('Could not delete this response.')
    } finally {
      setBusySubmissionId(null)
    }
  }

  async function bulkUpdateAnalysisState(excludedFromAnalysis: boolean) {
    const ids = [...selectedIds]
    setBulkBusy(true)
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/admin/assessments/${surveyId}/responses/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ excludedFromAnalysis }),
        }).then((r) => r.json() as Promise<{ ok?: boolean; submission?: Submission }>)
      )
    )
    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<{ ok?: boolean; submission?: Submission }> => r.status === 'fulfilled' && !!r.value.ok)
      .map((r) => r.value.submission!)
    const failCount = ids.length - succeeded.length

    if (succeeded.length > 0) {
      setRows((current) =>
        current.map((row) => {
          const updated = succeeded.find((s) => s.id === row.id)
          return updated ? { ...row, excluded_from_analysis: updated.excluded_from_analysis } : row
        })
      )
      toast.success(
        excludedFromAnalysis
          ? `${succeeded.length} response${succeeded.length !== 1 ? 's' : ''} ignored from analysis.`
          : `${succeeded.length} response${succeeded.length !== 1 ? 's' : ''} included in analysis.`
      )
    }
    if (failCount > 0) {
      toast.error(`${failCount} response${failCount !== 1 ? 's' : ''} could not be updated.`)
    }
    setBulkBusy(false)
  }

  async function bulkDeleteSubmissions() {
    const ids = [...selectedIds]
    if (!window.confirm(`Delete ${ids.length} response${ids.length !== 1 ? 's' : ''}? This permanently removes them and their scored psychometric rows.`)) {
      return
    }
    setBulkBusy(true)
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`/api/admin/assessments/${surveyId}/responses/${id}`, { method: 'DELETE' })
          .then((r) => r.json() as Promise<{ ok?: boolean }>)
          .then((body) => ({ id, ok: !!body.ok }))
      )
    )
    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<{ id: string; ok: boolean }> => r.status === 'fulfilled' && r.value.ok)
      .map((r) => r.value.id)
    const failCount = ids.length - succeeded.length

    if (succeeded.length > 0) {
      setRows((current) => current.filter((row) => !succeeded.includes(row.id)))
      setSelectedIds((current) => {
        const next = new Set(current)
        succeeded.forEach((id) => next.delete(id))
        return next
      })
      toast.success(`${succeeded.length} response${succeeded.length !== 1 ? 's' : ''} deleted.`)
    }
    if (failCount > 0) {
      toast.error(`${failCount} response${failCount !== 1 ? 's' : ''} could not be deleted.`)
    }
    setBulkBusy(false)
  }

  return (
    <div className="space-y-4">
      <ResponsesToolbar
        rows={rows}
        selectMode={selectMode}
        selectedIds={selectedIds}
        selectedCount={selectedIds.size}
        bulkBusy={bulkBusy}
        onToggleSelectMode={toggleSelectMode}
        onOpenCohorts={() => setCohortsOpen(true)}
        onBulkIgnore={() => void bulkUpdateAnalysisState(true)}
        onBulkInclude={() => void bulkUpdateAnalysisState(false)}
        onBulkDelete={() => void bulkDeleteSubmissions()}
      />

      <ResponsesTable
        surveyId={surveyId}
        rows={rows}
        loading={loading}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        busySubmissionId={busySubmissionId}
        onUpdateAnalysisState={updateAnalysisState}
        onDeleteSubmission={deleteSubmission}
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
