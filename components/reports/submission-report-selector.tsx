'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AssessmentReportActions } from '@/components/reports/assessment-report-actions'

export type SubmissionReportSelectorOption = {
  key: string
  label: string
  description: string
  currentDefault: boolean
  accessToken: string | null
}

type Props = {
  options: SubmissionReportSelectorOption[]
  initialKey?: string | null
  canEmail?: boolean
  linkClassName?: string
  exportClassName: string
  emailClassName: string
  statusClassName?: string
}

export function SubmissionReportSelector({
  options,
  initialKey,
  canEmail = true,
  linkClassName,
  exportClassName,
  emailClassName,
  statusClassName,
}: Props) {
  const firstKey = options.find((option) => option.accessToken)?.key ?? options[0]?.key ?? ''
  const [selectedKey, setSelectedKey] = useState(initialKey && options.some((option) => option.key === initialKey) ? initialKey : firstKey)

  const selected = useMemo(
    () => options.find((option) => option.key === selectedKey) ?? options.find((option) => option.accessToken) ?? null,
    [options, selectedKey]
  )

  if (options.length === 0 || !selected) {
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <label className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
          Report view
        </label>
        <select
          value={selected.key}
          onChange={(event) => setSelectedKey(event.target.value)}
          className="min-w-72 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.currentDefault ? `${option.label} (Current default)` : option.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">{selected.description}</p>

      <div className="flex flex-wrap items-center gap-3">
        {selected.accessToken ? (
          <>
            <Link
              href={`/assess/r/assessment?access=${encodeURIComponent(selected.accessToken)}`}
              className={linkClassName ?? 'rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700'}
            >
              View report
            </Link>
            <AssessmentReportActions
              reportType="assessment"
              accessToken={selected.accessToken}
              canEmail={canEmail}
              exportClassName={exportClassName}
              emailClassName={emailClassName}
              statusClassName={statusClassName}
            />
          </>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Report access is unavailable for this option.</p>
        )}
      </div>
    </div>
  )
}
