'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DEFAULT_REPORT_CONFIG, DEFAULT_RUNNER_CONFIG } from '@/utils/assessments/experience-config'

export default function NewAssessmentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [runnerConfigText, setRunnerConfigText] = useState(
    JSON.stringify(DEFAULT_RUNNER_CONFIG, null, 2)
  )
  const [reportConfigText, setReportConfigText] = useState(
    JSON.stringify(DEFAULT_REPORT_CONFIG, null, 2)
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    let runnerConfig: unknown
    let reportConfig: unknown
    try {
      runnerConfig = JSON.parse(runnerConfigText)
      reportConfig = JSON.parse(reportConfigText)
    } catch {
      setError('Runner/report config must be valid JSON.')
      setIsSaving(false)
      return
    }

    const response = await fetch('/api/admin/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, key, isPublic, runnerConfig, reportConfig }),
    })

    const body = (await response.json().catch(() => null)) as {
      ok?: boolean
      assessment?: { id: string }
      survey?: { id: string }
    } | null
    const createdAssessment = body?.assessment ?? body?.survey

    if (!response.ok || !body?.ok || !createdAssessment?.id) {
      setError('Could not create assessment.')
      setIsSaving(false)
      return
    }

    router.push(`/dashboard/assessments/${createdAssessment.id}`)
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Create assessment</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Key</span>
          <input value={key} onChange={(e) => setKey(e.target.value)} className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public assessment
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Runner config (JSON)</span>
          <textarea
            value={runnerConfigText}
            onChange={(e) => setRunnerConfigText(e.target.value)}
            rows={10}
            className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Report config (JSON)</span>
          <textarea
            value={reportConfigText}
            onChange={(e) => setReportConfigText(e.target.value)}
            rows={10}
            className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button disabled={isSaving} className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          {isSaving ? 'Saving...' : 'Create assessment'}
        </button>
      </form>
    </div>
  )
}
