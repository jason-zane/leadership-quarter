'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
  assessmentId: string
  submissionId: string
  excludedFromAnalysis: boolean
  excludedFromAnalysisAt: string | null
  excludedFromAnalysisReason: string | null
}

function formatDateTime(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ResponseAdminControls({
  assessmentId,
  submissionId,
  excludedFromAnalysis,
  excludedFromAnalysisAt,
  excludedFromAnalysisReason,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function updateAnalysisState(nextExcluded: boolean) {
    setBusy(true)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/responses/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedFromAnalysis: nextExcluded }),
      })
      const body = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'response_update_failed')
      }

      toast.success(
        nextExcluded
          ? 'Response will now be ignored by psychometric analysis.'
          : 'Response is back in psychometric analysis.'
      )
      router.refresh()
    } catch {
      toast.error('Could not update the analysis status for this response.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteSubmission() {
    if (!window.confirm('Delete this response permanently? This also removes its scored psychometric rows.')) {
      return
    }

    setBusy(true)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/responses/${submissionId}`, {
        method: 'DELETE',
      })
      const body = (await response.json()) as { ok?: boolean; error?: string }
      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'response_delete_failed')
      }

      toast.success('Response deleted.')
      router.push(`/dashboard/assessments/${assessmentId}/responses`)
      router.refresh()
    } catch {
      toast.error('Could not delete this response.')
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium',
                excludedFromAnalysis
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
              ].join(' ')}
            >
              {excludedFromAnalysis ? 'Ignored from analysis' : 'Included in analysis'}
            </span>
            {excludedFromAnalysisAt && (
              <span className="text-xs text-zinc-500">Changed {formatDateTime(excludedFromAnalysisAt)}</span>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {excludedFromAnalysis
              ? 'This submission stays visible in responses, but norms, validation runs, reliability checks, cohort comparisons, and math QA will skip it.'
              : 'This submission is currently included in psychometric analysis, norms, validation runs, and reliability checks.'}
          </p>
          {excludedFromAnalysisReason && (
            <p className="text-xs text-zinc-500">Reason: {excludedFromAnalysisReason}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void updateAnalysisState(!excludedFromAnalysis)
            }}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            {busy ? 'Saving...' : excludedFromAnalysis ? 'Include in analysis' : 'Ignore from analysis'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void deleteSubmission()
            }}
            className="rounded border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:text-red-300"
          >
            Delete response
          </button>
        </div>
      </div>
    </section>
  )
}
