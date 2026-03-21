'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'

type Props = {
  assessmentId: string
  initialStatus: string
  initialIsPublic: boolean
}

export function AssessmentPublishControls({ assessmentId, initialStatus, initialIsPublic }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [isPublic, setIsPublic] = useState(initialIsPublic)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function update(payload: Record<string, unknown>) {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!body.ok) {
        if (body.error === 'assessment_not_publishable') {
          setError('Assessment cannot be activated — ensure questions and scoring are configured.')
        } else {
          setError(body.error ?? 'Update failed.')
        }
        return
      }
      if (payload.status) setStatus(payload.status as string)
      if ('isPublic' in payload) setIsPublic(payload.isPublic as boolean)
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  const statusBadgeClass = status === 'active'
    ? 'bg-emerald-100 text-emerald-700'
    : status === 'archived'
      ? 'bg-gray-100 text-gray-600'
      : 'bg-amber-100 text-amber-700'

  return (
    <FoundationSurface className="p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Publish controls</h2>
        <p className="text-sm text-[var(--admin-text-muted)]">
          Set the assessment status and public access. Both must be enabled for the public assessment URL to work.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--admin-text-primary)]">Status</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass}`}>
              {status}
            </span>
          </div>
          {status === 'active' ? (
            <FoundationButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => update({ status: 'draft' })}
            >
              Deactivate
            </FoundationButton>
          ) : (
            <FoundationButton
              type="button"
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={() => update({ status: 'active' })}
            >
              Activate
            </FoundationButton>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--admin-text-primary)]">Public access</span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {isPublic ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <FoundationButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => update({ isPublic: !isPublic })}
          >
            {isPublic ? 'Disable' : 'Enable'}
          </FoundationButton>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : null}
    </FoundationSurface>
  )
}
