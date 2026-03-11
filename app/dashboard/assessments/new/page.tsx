'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function NewAssessmentPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [externalName, setExternalName] = useState('')
  const [externalNameDirty, setExternalNameDirty] = useState(false)
  const [key, setKey] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    setIsSaving(true)

    const response = await fetch('/api/admin/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        external_name: externalName,
        key,
        isPublic,
      }),
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
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Create assessment</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Create the shell first. Questions, competencies, scoring models, experience, and reports are all configured after creation so the builder follows the real setup order.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-6 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Internal name</span>
            <input
              value={name}
              onChange={(e) => {
                const value = e.target.value
                setName(value)
                if (!externalNameDirty) {
                  setExternalName(value)
                }
              }}
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Shown in admin only.</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">External name</span>
            <input
              value={externalName}
              onChange={(e) => {
                setExternalNameDirty(true)
                setExternalName(e.target.value)
              }}
              required
              className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Used on reports, emails, and participant-facing pages.</span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Key</span>
            <input value={key} onChange={(e) => setKey(e.target.value)} required className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public assessment
        </label>

        <div className="grid gap-4 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300 md:grid-cols-4">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">1. Questions</p>
            <p className="mt-1">Add items and define the competencies they belong to.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">2. Scoring</p>
            <p className="mt-1">Create the scoring model that interprets those competencies.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">3. Psychometrics</p>
            <p className="mt-1">Layer in advanced statistical setup if this model needs it.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">4. Reports</p>
            <p className="mt-1">Publish report variants that sit on top of the scoring model.</p>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button disabled={isSaving} className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900">
          {isSaving ? 'Saving...' : 'Create assessment'}
        </button>
      </form>
    </div>
  )
}
