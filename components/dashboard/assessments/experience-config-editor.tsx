'use client'

import { useState } from 'react'

type Props = {
  assessmentId: string
  initialRunnerConfig: unknown
  initialReportConfig: unknown
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

export function AssessmentExperienceConfigEditor({
  assessmentId,
  initialRunnerConfig,
  initialReportConfig,
}: Props) {
  const [runnerConfigText, setRunnerConfigText] = useState(formatJson(initialRunnerConfig))
  const [reportConfigText, setReportConfigText] = useState(formatJson(initialReportConfig))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  async function save() {
    let runnerConfig: unknown
    let reportConfig: unknown

    setError(null)
    setSavedAt(null)

    try {
      runnerConfig = JSON.parse(runnerConfigText)
      reportConfig = JSON.parse(reportConfigText)
    } catch {
      setError('Runner/report config must be valid JSON.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runnerConfig, reportConfig }),
      })

      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        setError(body?.error ?? 'Failed to save experience configuration.')
        return
      }

      setSavedAt(new Date().toLocaleTimeString())
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Assessment experience</h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Configure runner and report behavior for all entries of this assessment.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Runner config JSON</span>
          <textarea
            value={runnerConfigText}
            onChange={(e) => setRunnerConfigText(e.target.value)}
            rows={14}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Report config JSON</span>
          <textarea
            value={reportConfigText}
            onChange={(e) => setReportConfigText(e.target.value)}
            rows={14}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {savedAt ? <p className="mt-3 text-xs text-emerald-600">Saved at {savedAt}</p> : null}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? 'Saving...' : 'Save experience config'}
        </button>
      </div>
    </section>
  )
}
