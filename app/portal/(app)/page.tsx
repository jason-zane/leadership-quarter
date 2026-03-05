'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalHeader } from '@/components/portal/ui/portal-header'
import { PortalMetricCard } from '@/components/portal/ui/metric-card'
import { PortalStatusPanel } from '@/components/portal/ui/status-panel'

type OverviewPayload = {
  ok: boolean
  metrics?: {
    campaigns_total: number
    campaigns_active: number
    invitations_total: number
    submissions_total: number
    average_score: number | null
  }
  campaigns_by_status?: {
    draft: number
    active: number
    closed: number
    archived: number
  }
  recent_results?: Array<{
    submission_id: string
    campaign_id: string
    campaign_name: string
    participant_name: string
    email: string
    classification_label: string
    summary_score: number | null
    created_at: string
  }>
  message?: string
  error?: string
}

export default function PortalPage() {
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/portal/overview', { cache: 'no-store' })
        const body = (await res.json()) as OverviewPayload
        if (!mounted) return

        if (!res.ok || !body.ok || !body.metrics || !body.campaigns_by_status) {
          setLoadError(body.message ?? 'Portal request failed. Try again.')
          setData(null)
          return
        }

        setData(body)
      } catch {
        if (!mounted) return
        setLoadError('Portal request failed. Try again.')
        setData(null)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (!data) {
    return (
      <PortalShell>
        {loadError ? (
          <PortalStatusPanel title="Portal request failed" tone="danger">
            <p>{loadError}</p>
          </PortalStatusPanel>
        ) : (
          <p className="text-sm text-[var(--portal-text-muted)]">Loading...</p>
        )}
      </PortalShell>
    )
  }

  const metrics = data.metrics ?? {
    campaigns_total: 0,
    campaigns_active: 0,
    invitations_total: 0,
    submissions_total: 0,
    average_score: null,
  }
  const byStatus = data.campaigns_by_status ?? {
    draft: 0,
    active: 0,
    closed: 0,
    archived: 0,
  }
  const recentResults = data.recent_results ?? []

  return (
    <PortalShell>
      <PortalHeader
        title="Overview"
        description="Campaign health, participant activity, and recent results."
      />

      <div className="grid gap-4 md:grid-cols-5">
        <PortalMetricCard label="Campaigns" value={metrics.campaigns_total} />
        <PortalMetricCard label="Active campaigns" value={metrics.campaigns_active} />
        <PortalMetricCard label="Invitations" value={metrics.invitations_total} />
        <PortalMetricCard label="Submissions" value={metrics.submissions_total} />
        <PortalMetricCard label="Average score" value={metrics.average_score ?? '—'} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PortalStatusPanel title="Campaign status snapshot">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p>Draft: <strong>{byStatus.draft}</strong></p>
            <p>Active: <strong>{byStatus.active}</strong></p>
            <p>Closed: <strong>{byStatus.closed}</strong></p>
            <p>Archived: <strong>{byStatus.archived}</strong></p>
          </div>
        </PortalStatusPanel>

        <PortalStatusPanel title="Quick actions">
          <div className="flex flex-wrap gap-3">
            <Link href="/portal/campaigns" className="portal-inline-link">Manage campaigns</Link>
            <Link href="/portal/participants" className="portal-inline-link">Find participant</Link>
          </div>
        </PortalStatusPanel>
      </div>

      <FoundationTableFrame className="overflow-x-auto border-[var(--portal-border)] bg-[var(--portal-surface)]">
        <table className="portal-table">
          <thead>
            <tr className="portal-table-head-row">
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {recentResults.length === 0 ? (
              <tr>
                <td colSpan={7} className="portal-table-cell-muted px-4 py-6 text-center">
                  No participant results yet.
                </td>
              </tr>
            ) : (
              recentResults.map((row) => (
                <tr key={row.submission_id} className="portal-table-row">
                  <td className="px-4 py-3">{row.participant_name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.campaign_name}</td>
                  <td className="portal-table-cell-muted px-4 py-3">{row.classification_label}</td>
                  <td className="px-4 py-3">{row.summary_score ?? '—'}</td>
                  <td className="portal-table-cell-muted px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/portal/participants/${row.submission_id}`} className="portal-inline-link">
                      View result
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </FoundationTableFrame>
    </PortalShell>
  )
}
