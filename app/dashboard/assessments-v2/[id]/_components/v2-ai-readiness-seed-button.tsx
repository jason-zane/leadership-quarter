'use client'

import { useState } from 'react'

export function V2AiReadinessSeedButton({ assessmentId }: { assessmentId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function seed() {
    setLoading(true)
    setMessage(null)

    const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/seed-ai-readiness`, {
      method: 'POST',
    }).catch(() => null)
    const body = (await response?.json().catch(() => null)) as { ok?: boolean; error?: string } | null

    if (!response?.ok || !body?.ok) {
      setMessage('Could not seed the AI Readiness V2 setup.')
      setLoading(false)
      return
    }

    setMessage('AI Readiness V2 setup seeded.')
    setLoading(false)
    window.location.reload()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => void seed()}
        className="foundation-btn foundation-btn-secondary foundation-btn-md"
        disabled={loading}
      >
        {loading ? 'Seeding...' : 'Seed AI Readiness V2'}
      </button>
      {message ? <p className="text-xs text-[var(--admin-text-muted)]">{message}</p> : null}
    </div>
  )
}
