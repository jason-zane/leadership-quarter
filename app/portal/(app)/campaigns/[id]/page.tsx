'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { PortalCampaignWorkspaceHeader } from '@/components/portal/campaign-workspace-header'
import { PortalMetricCard } from '@/components/portal/ui/metric-card'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalStatusPanel } from '@/components/portal/ui/status-panel'

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

export default function PortalCampaignWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [campaignId, setCampaignId] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsPayload['analytics'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

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

  const loadWorkspace = useCallback(async () => {
    if (!campaignId) return

    setLoading(true)
    setWorkspaceError(null)

    const [campaignRes, analyticsRes] = await Promise.all([
      fetch(`/api/portal/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/portal/campaigns/${campaignId}/analytics`, { cache: 'no-store' }),
    ])

    const campaignBody = (await campaignRes.json()) as { campaign?: Campaign; ok?: boolean; message?: string }
    const analyticsBody = (await analyticsRes.json()) as AnalyticsPayload & { ok?: boolean; message?: string }

    if (!campaignRes.ok || !campaignBody.campaign) {
      setWorkspaceError(campaignBody.message ?? 'Campaign not found.')
      setCampaign(null)
      setLoading(false)
      return
    }

    setCampaign(campaignBody.campaign)
    setAnalytics(analyticsBody.analytics ?? null)
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!campaignId || !mounted) return
      await loadWorkspace()
    })()
    return () => {
      mounted = false
    }
  }, [campaignId, loadWorkspace])

  async function updateStatus(nextStatus: CampaignStatus) {
    if (!campaignId) return
    setUpdatingStatus(true)
    setWorkspaceError(null)
    try {
      const res = await fetch(`/api/portal/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const body = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok || !body.ok) {
        setWorkspaceError(body.message ?? body.error ?? 'Failed to update campaign status.')
        return
      }
      await loadWorkspace()
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <PortalShell>
        <p className="text-sm text-[var(--portal-text-muted)]">Loading campaign workspace...</p>
      </PortalShell>
    )
  }

  if (!campaign) {
    return (
      <PortalShell>
        <p className="text-sm text-[var(--portal-text-muted)]">Campaign not found.</p>
      </PortalShell>
    )
  }

  return (
    <PortalShell>
      <PortalCampaignWorkspaceHeader
        campaign={campaign}
        activeTab="summary"
        updatingStatus={updatingStatus}
        onStatusChange={(status) => {
          void updateStatus(status)
        }}
      />

      {workspaceError ? (
        <PortalStatusPanel title="Action failed" tone="danger">
          <p>{workspaceError}</p>
        </PortalStatusPanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <PortalMetricCard label="Invitations" value={analytics?.totals.invitations ?? 0} />
        <PortalMetricCard label="Submissions" value={analytics?.totals.submissions ?? 0} />
        <PortalMetricCard label="Open rate" value={`${analytics?.rates.open_rate ?? 0}%`} />
        <PortalMetricCard label="Start rate" value={`${analytics?.rates.start_rate ?? 0}%`} />
        <PortalMetricCard label="Completion rate" value={`${analytics?.rates.completion_rate ?? 0}%`} />
        <PortalMetricCard label="Average score" value={analytics?.scores.average ?? '—'} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PortalStatusPanel title="What to do here">
          <div className="space-y-3 text-sm text-[var(--portal-text-primary)]">
            <p>Use this summary page for campaign health and route into the right working tab.</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/portal/campaigns/${campaign.id}/invitations`} className="portal-action-link">
                Manage invitations
              </Link>
              <Link href={`/portal/campaigns/${campaign.id}/responses`} className="portal-action-link">
                Review responses
              </Link>
              <Link href={`/portal/campaigns/${campaign.id}/analytics`} className="portal-action-link">
                Open analytics
              </Link>
            </div>
          </div>
        </PortalStatusPanel>

        <PortalStatusPanel title="Current read">
          <div className="space-y-2 text-sm text-[var(--portal-text-primary)]">
            <p>
              {campaign.status === 'active'
                ? 'This campaign is live and able to accept participant activity.'
                : campaign.status === 'draft'
                  ? 'This campaign is still in draft. Use Invitations when you are ready to start.'
                  : campaign.status === 'closed'
                    ? 'This campaign is closed to new activity but still available for review and export.'
                    : 'This campaign is archived. Keep it for reference only.'}
            </p>
            <p className="text-[var(--portal-text-muted)]">
              Invitation management stays in Invitations, and response review stays in Responses.
            </p>
          </div>
        </PortalStatusPanel>
      </div>
    </PortalShell>
  )
}
