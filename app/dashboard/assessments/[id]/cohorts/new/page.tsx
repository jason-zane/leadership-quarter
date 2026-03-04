'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type ParsedRow = {
  email: string
  firstName?: string
  lastName?: string
  organisation?: string
  role?: string
}

function parseRows(input: string) {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, firstName, lastName, organisation, role] = line.split(',').map((item) => item.trim())
      return { email, firstName, lastName, organisation, role }
    })
    .filter((row) => row.email.includes('@'))
}

export default function NewSurveyCohortPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id
  const router = useRouter()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [rowsRaw, setRowsRaw] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(send: boolean) {
    setError(null)
    setIsSaving(true)

    const cohortResponse = await fetch(`/api/admin/assessments/${surveyId}/cohorts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, status: send ? 'active' : 'draft' }),
    })

    const cohortBody = (await cohortResponse.json().catch(() => null)) as { ok?: boolean; cohort?: { id: string } } | null

    if (!cohortResponse.ok || !cohortBody?.ok || !cohortBody.cohort?.id) {
      setError('Could not create cohort.')
      setIsSaving(false)
      return
    }

    const invitations = parseRows(rowsRaw)
    if (invitations.length > 0) {
      await fetch(`/api/admin/assessments/${surveyId}/cohorts/${cohortBody.cohort.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitations, send }),
      })
    }

    router.push(`/dashboard/assessments/${surveyId}/cohorts/${cohortBody.cohort.id}`)
  }

  const parsed = parseRows(rowsRaw)

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Create cohort</h1>
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cohort name" className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
        <textarea
          value={rowsRaw}
          onChange={(e) => setRowsRaw(e.target.value)}
          className="min-h-[200px] w-full rounded border border-zinc-300 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          placeholder="email,firstName,lastName,org,role"
        />
        <p className="text-xs text-zinc-500">Parsed rows: {parsed.length}</p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-3">
          <button disabled={isSaving} onClick={() => create(true)} className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Create & send</button>
          <button disabled={isSaving} onClick={() => create(false)} className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">Create as draft</button>
        </div>
      </div>
    </div>
  )
}
