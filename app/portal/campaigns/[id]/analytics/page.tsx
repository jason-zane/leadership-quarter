'use client'

import { useEffect, useState } from 'react'

type AnalyticsPayload = {
  analytics: {
    totals: {
      invitations: number
      sent: number
      opened: number
      started: number
      completed: number
      submissions: number
    }
    rates: {
      open_rate: number
      start_rate: number
      completion_rate: number
    }
    scores: {
      average: number | null
      sample_size: number
    }
  }
}

export default function PortalCampaignAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaignId, setCampaignId] = useState('')
  const [data, setData] = useState<AnalyticsPayload | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const value = (await params).id
      if (mounted) setCampaignId(value)
    })()
    return () => {
      mounted = false
    }
  }, [params])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!campaignId || !mounted) return
      const res = await fetch(`/api/portal/campaigns/${campaignId}/analytics`, { cache: 'no-store' })
      const body = (await res.json()) as AnalyticsPayload
      setData(body)
    })()
    return () => {
      mounted = false
    }
  }, [campaignId])

  if (!data) {
    return <p className="text-sm text-zinc-500">Loading...</p>
  }

  const { totals, rates, scores } = data.analytics

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Analytics</h1>
        <a
          href={`/api/portal/campaigns/${campaignId}/exports`}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-700"
        >
          Export CSV
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Invitations" value={totals.invitations} />
        <Metric label="Submissions" value={totals.submissions} />
        <Metric label="Average score" value={scores.average ?? '—'} />
        <Metric label="Open rate" value={`${rates.open_rate}%`} />
        <Metric label="Start rate" value={`${rates.start_rate}%`} />
        <Metric label="Completion rate" value={`${rates.completion_rate}%`} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}
