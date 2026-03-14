'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'

export default function NewAssessmentV2Page() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [externalName, setExternalName] = useState('')
  const [externalNameDirty, setExternalNameDirty] = useState(false)
  const [key, setKey] = useState('')
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

    router.push(`/dashboard/assessments-v2/${createdAssessment.id}`)
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessments"
        title="Create assessment"
        description="Create the shell first, then continue in the assessment workspace to define structure, delivery, and reports."
      />

      <FoundationSurface className="p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">Internal name</span>
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
                className="foundation-field w-full"
              />
              <span className="text-xs text-[var(--admin-text-muted)]">Shown in admin only.</span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">External name</span>
              <input
                value={externalName}
                onChange={(e) => {
                  setExternalNameDirty(true)
                  setExternalName(e.target.value)
                }}
                required
                className="foundation-field w-full"
              />
              <span className="text-xs text-[var(--admin-text-muted)]">
                Used on participant-facing pages, emails, and reports.
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">Key</span>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
                className="foundation-field w-full"
              />
              <span className="text-xs text-[var(--admin-text-muted)]">
                The machine-readable ID used in URLs and runtime lookups. It is normalized to lowercase with underscores.
              </span>
            </label>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex items-center gap-3">
            <FoundationButton type="submit" variant="primary" size="md" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Create assessment'}
            </FoundationButton>
          </div>
        </form>
      </FoundationSurface>
    </DashboardPageShell>
  )
}
