'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  assessmentId: string
  assessmentName: string
}

type QuickLaunchResponse = {
  ok?: boolean
  campaignId?: string
  error?: string
}

export function QuickLaunchButton({ assessmentId, assessmentName }: Props) {
  const router = useRouter()
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleQuickLaunch() {
    setLaunching(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/quick-launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const body = (await response.json().catch(() => null)) as QuickLaunchResponse | null

      if (!response.ok || !body?.ok || !body.campaignId) {
        setError(body?.error ?? 'Failed to create campaign.')
        return
      }

      router.push(`/dashboard/campaigns/${body.campaignId}`)
    } catch {
      setError('Failed to create campaign.')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleQuickLaunch()}
        disabled={launching}
        className="foundation-btn foundation-btn-secondary foundation-btn-md"
      >
        {launching ? 'Creating campaign...' : 'Quick launch'}
      </button>
      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
        Creates a default campaign for {assessmentName} and activates it immediately.
      </p>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
    </div>
  )
}
