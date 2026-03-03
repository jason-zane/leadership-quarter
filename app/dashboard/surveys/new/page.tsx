'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewSurveyPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    const response = await fetch('/api/admin/surveys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, key, isPublic }),
    })

    const body = (await response.json().catch(() => null)) as { ok?: boolean; survey?: { id: string } } | null

    if (!response.ok || !body?.ok || !body.survey?.id) {
      setError('Could not create survey.')
      setIsSaving(false)
      return
    }

    router.push(`/dashboard/surveys/${body.survey.id}`)
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Create survey</h1>
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
          Public survey
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button disabled={isSaving} className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
          {isSaving ? 'Saving...' : 'Create survey'}
        </button>
      </form>
    </div>
  )
}
