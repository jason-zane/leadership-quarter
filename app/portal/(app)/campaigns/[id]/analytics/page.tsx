'use client'

import { useCallback, useEffect, useState } from 'react'
import { PortalCampaignWorkspaceHeader } from '@/components/portal/campaign-workspace-header'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalMetricCard } from '@/components/portal/ui/metric-card'

type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'
type Campaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
}

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
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

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

  const load = useCallback(async () => {
    if (!campaignId) return
    const [campaignRes, analyticsRes] = await Promise.all([
      fetch(`/api/portal/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/portal/campaigns/${campaignId}/analytics`, { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as { campaign?: Campaign }
    const body = (await analyticsRes.json()) as AnalyticsPayload
    setCampaign(campaignBody.campaign ?? null)
    setData(body)
  }, [campaignId])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!campaignId || !mounted) return
      await load()
    })()
    return () => {
      mounted = false
    }
  }, [campaignId, load])

  async function updateStatus(nextStatus: CampaignStatus) {
    if (!campaignId) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/portal/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const body = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok || !body.ok) {
        return
      }
      await load()
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (!data || !campaign) {
    return (
      <PortalShell>
        <p className="text-sm text-[var(--portal-text-muted)]">Loading...</p>
      </PortalShell>
    )
  }

  const { totals, rates, scores } = data.analytics

  return (
    <PortalShell>
      <PortalCampaignWorkspaceHeader
        campaign={campaign}
        activeTab="analytics"
        description="Campaign performance and conversion metrics."
        updatingStatus={updatingStatus}
        onStatusChange={(status) => {
          void updateStatus(status)
        }}
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
