'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'

type Props = {
  assessmentId: string
  initialName: string
  initialExternalName: string | null
  initialKey: string
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
}

export function AssessmentRenameForm({ assessmentId, initialName, initialExternalName, initialKey }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [externalName, setExternalName] = useState(initialExternalName ?? '')
  const [key, setKey] = useState(initialKey)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const normalizedKey = normalizeKey(key)
  const isDirty = name !== initialName || externalName !== (initialExternalName ?? '') || normalizedKey !== initialKey

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          external_name: externalName.trim() || null,
          key: normalizedKey,
        }),
      })
      const body = await response.json()
      if (!body.ok) {
        const msg = body.error ?? 'Save failed.'
        setError(msg === 'survey_update_failed' ? 'That key is already in use — choose a different one.' : msg)
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FoundationSurface className="p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Assessment names</h2>
        <p className="text-sm text-[var(--admin-text-muted)]">
          The internal name is used in the dashboard. The external name is shown to participants. The key appears in the direct assessment URL.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="assessment-name" className="text-sm font-medium text-[var(--admin-text-primary)]">
              Internal name
            </label>
            <input
              id="assessment-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaved(false) }}
              className="rounded-lg border border-[rgba(103,127,159,0.24)] bg-white px-3 py-2 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
              placeholder="e.g. AI Readiness"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="assessment-external-name" className="text-sm font-medium text-[var(--admin-text-primary)]">
              External name
            </label>
            <input
              id="assessment-external-name"
              type="text"
              value={externalName}
              onChange={(e) => { setExternalName(e.target.value); setSaved(false) }}
              className="rounded-lg border border-[rgba(103,127,159,0.24)] bg-white px-3 py-2 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
              placeholder="Shown to participants (optional)"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="assessment-key" className="text-sm font-medium text-[var(--admin-text-primary)]">
            Assessment key
          </label>
          <input
            id="assessment-key"
            type="text"
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false) }}
            className="rounded-lg border border-[rgba(103,127,159,0.24)] bg-white px-3 py-2 text-sm font-mono text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]"
            placeholder="e.g. ai_readiness"
          />
          {key !== normalizedKey && normalizedKey ? (
            <p className="text-xs text-[var(--admin-text-muted)]">Will be saved as: <span className="font-mono">{normalizedKey}</span></p>
          ) : null}
          <p className="text-xs text-amber-700">Changing the key changes the direct assessment URL (/assess/p/[key]).</p>
        </div>

        <div className="flex items-center gap-3">
          <FoundationButton
            type="submit"
            variant="primary"
            size="sm"
            disabled={saving || !isDirty || !name.trim()}
          >
            {saving ? 'Saving...' : 'Save names'}
          </FoundationButton>
          {saved && !isDirty ? (
            <p className="text-sm text-emerald-700">Saved</p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
        </div>
      </form>
    </FoundationSurface>
  )
}
