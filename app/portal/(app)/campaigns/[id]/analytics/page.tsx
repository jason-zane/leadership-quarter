'use client'

import { useEffect, useState } from 'react'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalHeader } from '@/components/portal/ui/portal-header'
import { PortalMetricCard } from '@/components/portal/ui/metric-card'

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
    return (
      <PortalShell>
        <p className="text-sm text-[var(--portal-text-muted)]">Loading...</p>
      </PortalShell>
    )
  }

  const { totals, rates, scores } = data.analytics

  return (
    <PortalShell>
      <PortalHeader
        title="Analytics"
        actions={(
          <a
          href={`/api/portal/campaigns/${campaignId}/exports`}
          className="foundation-btn foundation-btn-secondary foundation-btn-sm portal-btn-secondary inline-flex items-center"
        >
          Export CSV
        </a>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalMetricCard label="Invitations" value={totals.invitations} />
        <PortalMetricCard label="Submissions" value={totals.submissions} />
        <PortalMetricCard label="Average score" value={scores.average ?? '—'} />
        <PortalMetricCard label="Open rate" value={`${rates.open_rate}%`} />
        <PortalMetricCard label="Start rate" value={`${rates.start_rate}%`} />
        <PortalMetricCard label="Completion rate" value={`${rates.completion_rate}%`} />
      </div>
    </PortalShell>
  )
}
