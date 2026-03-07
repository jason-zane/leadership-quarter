'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type InviteRow = {
  email: string
  first_name?: string
  last_name?: string
  organisation?: string
  role?: string
}

function parseRows(input: string): InviteRow[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, firstName, lastName, organisation, role] = line.split(',').map((item) => item.trim())
      return {
        email: email?.toLowerCase() ?? '',
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        organisation: organisation || undefined,
        role: role || undefined,
      }
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

  const parsed = useMemo(() => parseRows(rowsRaw), [rowsRaw])

  async function create(sendNow: boolean) {
    setError(null)
    setIsSaving(true)

    const cohortResponse = await fetch(`/api/admin/assessments/${surveyId}/cohorts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, status: sendNow ? 'active' : 'draft' }),
    })

    const cohortBody = (await cohortResponse.json().catch(() => null)) as { ok?: boolean; cohort?: { id: string } } | null

    if (!cohortResponse.ok || !cohortBody?.ok || !cohortBody.cohort?.id) {
      setError('Could not create cohort.')
      setIsSaving(false)
      return
    }

    if (parsed.length > 0) {
      const invitesRes = await fetch(`/api/admin/assessments/${surveyId}/cohorts/${cohortBody.cohort.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitations: parsed, send_now: sendNow }),
      })

      if (!invitesRes.ok) {
        setError('Cohort created, but invitations failed. You can retry from the cohort page.')
        setIsSaving(false)
        router.push(`/dashboard/assessments/${surveyId}/cohorts/${cohortBody.cohort.id}`)
        return
      }
    }

    router.push(`/dashboard/assessments/${surveyId}/cohorts/${cohortBody.cohort.id}`)
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment operations"
        title="Create Cohort"
        description="Create a cohort and optionally bulk-add invitations in one step."
      />

      <div className="foundation-surface foundation-surface-admin p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cohort name" className="foundation-field" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="foundation-field" />
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Bulk invitations</span>
          <textarea
            value={rowsRaw}
            onChange={(e) => setRowsRaw(e.target.value)}
            className="foundation-field min-h-[200px]"
            placeholder="email,firstName,lastName,organisation,role"
          />
        </label>
        <p className="mt-2 text-xs text-[var(--admin-text-muted)]">Parsed rows: {parsed.length}</p>

        {parsed.length > 0 ? (
          <div className="mt-4">
            <DashboardDataTableShell>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Organisation</th>
                    <th className="px-4 py-3">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.slice(0, 8).map((row, idx) => (
                    <tr key={`${row.email}-${idx}`} className="border-t border-[var(--admin-border)]">
                      <td className="px-4 py-2.5">{row.email}</td>
                      <td className="px-4 py-2.5">{[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--admin-text-muted)]">{row.organisation ?? '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--admin-text-muted)]">{row.role ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DashboardDataTableShell>
            {parsed.length > 8 ? (
              <p className="mt-2 text-xs text-[var(--admin-text-muted)]">Showing first 8 of {parsed.length} parsed rows.</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <button disabled={isSaving} onClick={() => void create(true)} className="foundation-btn foundation-btn-primary px-4 py-2 text-sm">
            {isSaving ? 'Saving...' : 'Create and send'}
          </button>
          <button disabled={isSaving} onClick={() => void create(false)} className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm">
            Create as draft
          </button>
        </div>
      </div>
    </DashboardPageShell>
  )
}
