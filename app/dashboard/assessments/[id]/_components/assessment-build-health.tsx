'use client'

import { useEffect, useState } from 'react'
import type { ScoringCoverageIssue } from '@/utils/assessments/types'

type Check = {
  label: string
  pass: boolean
  message: string
  blocking?: boolean
}

export function AssessmentBuildHealth({
  assessmentId,
  dataCollectionOnly = false,
}: {
  assessmentId: string
  dataCollectionOnly?: boolean
}) {
  const [checks, setChecks] = useState<Check[] | null>(null)
  const [issues, setIssues] = useState<ScoringCoverageIssue[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (dataCollectionOnly) return

    async function load() {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/scoring`, { cache: 'no-store' })
      const body = (await response.json().catch(() => null)) as {
        analysis?: { checks?: Check[]; coverage?: { issues?: ScoringCoverageIssue[] } }
      } | null
      const result = body?.analysis?.checks ?? []
      setChecks(result)
      setIssues(body?.analysis?.coverage?.issues ?? [])
      // Expand by default if any check fails
      setOpen(result.some((c) => !c.pass))
    }
    void load()
  }, [assessmentId, dataCollectionOnly])

  if (!checks) return null

  if (dataCollectionOnly) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 px-5 py-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Build health</h2>
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Data collection mode
          </span>
        </div>
        <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">Scoring checks skipped — this assessment is set to data collection only.</p>
        </div>
      </div>
    )
  }

  const allGood = checks.every((c) => c.pass)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Build health</h2>
          {allGood ? (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              All good
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {checks.filter((c) => !c.pass).length} issue{checks.filter((c) => !c.pass).length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg
          className={['h-4 w-4 text-zinc-400 transition-transform', open ? 'rotate-180' : ''].join(' ')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4">
          <ul className="space-y-2">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-3">
                {check.pass ? (
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                )}
                <div>
                  <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{check.label}</p>
                  <p className="text-xs text-zinc-500">{check.message}</p>
                </div>
              </li>
            ))}
          </ul>
          {issues.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Top coverage issues</p>
              <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {issues.slice(0, 5).map((issue, index) => (
                  <li key={`${issue.type}-${index}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
