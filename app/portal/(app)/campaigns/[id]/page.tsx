'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput } from '@/components/ui/foundation/field'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'
import { PortalHeader } from '@/components/portal/ui/portal-header'
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

type Invitation = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  created_at: string
}

type ResponseRow = {
  id: string
  created_at: string
  score: number | null
  classification_label?: string
  assessment_invitations?: {
    email?: string
    first_name?: string
    last_name?: string
  } | null
}

const allowedStatusTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['active', 'archived'],
  active: ['closed', 'archived'],
  closed: ['archived'],
  archived: [],
}

export default function PortalCampaignWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [campaignId, setCampaignId] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsPayload['analytics'] | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [sendNow, setSendNow] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

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

    const [campaignRes, analyticsRes, invitationsRes, responsesRes] = await Promise.all([
      fetch(`/api/portal/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/portal/campaigns/${campaignId}/analytics`, { cache: 'no-store' }),
      fetch(`/api/portal/campaigns/${campaignId}/invitations`, { cache: 'no-store' }),
      fetch(`/api/portal/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
    ])

    const campaignBody = (await campaignRes.json()) as { campaign?: Campaign; ok?: boolean; message?: string }
    const analyticsBody = (await analyticsRes.json()) as AnalyticsPayload & { ok?: boolean; message?: string }
    const invitationsBody = (await invitationsRes.json()) as { invitations?: Invitation[]; ok?: boolean; message?: string }
    const responsesBody = (await responsesRes.json()) as { responses?: ResponseRow[]; ok?: boolean; message?: string }

    if (!campaignRes.ok || !campaignBody.campaign) {
      setWorkspaceError(campaignBody.message ?? 'Campaign not found.')
      setCampaign(null)
      setLoading(false)
      return
    }

    setCampaign(campaignBody.campaign)
    setAnalytics(analyticsBody.analytics ?? null)
    setInvitations(invitationsBody.invitations ?? [])
    setResponses(responsesBody.responses ?? [])
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

  async function addInvitation(e: React.FormEvent) {
    e.preventDefault()
    if (!campaignId) return

    setInviting(true)
    setWorkspaceError(null)
    try {
      const res = await fetch(`/api/portal/campaigns/${campaignId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          send: sendNow,
          invitations: [{ email, firstName, lastName }],
        }),
      })
      const body = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok || !body.ok) {
        setWorkspaceError(body.message ?? body.error ?? 'Failed to add invitation.')
        return
      }

      setEmail('')
      setFirstName('')
      setLastName('')
      await loadWorkspace()
    } finally {
      setInviting(false)
    }
  }

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

  const filteredResponses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return responses
    return responses.filter((row) => {
      const name = [
        row.assessment_invitations?.first_name,
        row.assessment_invitations?.last_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const emailValue = (row.assessment_invitations?.email ?? '').toLowerCase()
      return name.includes(q) || emailValue.includes(q)
    })
  }, [responses, searchTerm])

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

  const allowedTransitions = allowedStatusTransitions[campaign.status] ?? []

  return (
    <PortalShell>
      <PortalHeader
        eyebrow="Campaign workspace"
        title={campaign.name}
        description={`Campaign workspace • ${campaign.slug}`}
        actions={(
          <div className="flex items-center gap-2">
            <span className={`portal-status-pill ${
              campaign.status === 'active'
                ? 'bg-emerald-100 text-emerald-800'
                : campaign.status === 'closed'
                  ? 'bg-blue-100 text-blue-800'
                  : campaign.status === 'archived'
                    ? 'bg-zinc-200 text-zinc-700'
                    : 'bg-amber-100 text-amber-800'
            }`}
            >
              {campaign.status}
            </span>
            <a
              href={`/api/portal/campaigns/${campaign.id}/exports`}
              className="foundation-btn foundation-btn-secondary foundation-btn-sm portal-btn-secondary inline-flex items-center"
            >
              Export CSV
            </a>
            <ActionMenu
              items={[
                ...(allowedTransitions.includes('active')
                  ? [{ type: 'item', label: updatingStatus ? 'Updating...' : 'Turn on (Active)', onSelect: () => void updateStatus('active'), disabled: updatingStatus } as ActionItem]
                  : []),
                ...(allowedTransitions.includes('closed')
                  ? [{ type: 'item', label: updatingStatus ? 'Updating...' : 'Turn off (Close)', onSelect: () => void updateStatus('closed'), disabled: updatingStatus } as ActionItem]
                  : []),
                ...(allowedTransitions.includes('archived')
                  ? [{ type: 'item', label: updatingStatus ? 'Updating...' : 'Archive campaign', onSelect: () => void updateStatus('archived'), disabled: updatingStatus, destructive: true } as ActionItem]
                  : []),
              ]}
            />
          </div>
        )}
      />

      {workspaceError ? (
        <PortalStatusPanel title="Action failed" tone="danger">
          <p>{workspaceError}</p>
        </PortalStatusPanel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <PortalMetricCard label="Invitations" value={analytics?.totals.invitations ?? 0} />
        <PortalMetricCard label="Submissions" value={analytics?.totals.submissions ?? 0} />
        <PortalMetricCard label="Average score" value={analytics?.scores.average ?? '—'} />
        <PortalMetricCard label="Open rate" value={`${analytics?.rates.open_rate ?? 0}%`} />
        <PortalMetricCard label="Start rate" value={`${analytics?.rates.start_rate ?? 0}%`} />
        <PortalMetricCard label="Completion rate" value={`${analytics?.rates.completion_rate ?? 0}%`} />
      </div>

      <PortalStatusPanel title="Invite participants">
        <form onSubmit={addInvitation} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <FoundationInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="email@company.com"
              required
            />
            <FoundationInput
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
            <FoundationInput
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
            <FoundationButton type="submit" variant="primary" disabled={inviting}>
              {inviting ? 'Adding...' : 'Add invite'}
            </FoundationButton>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--portal-text-muted)]">
              <input type="checkbox" checked={sendNow} onChange={(e) => setSendNow(e.target.checked)} />
              Send invitation email now
            </label>
            <p className="text-xs text-[var(--portal-text-muted)]">
              Add one participant quickly here. Use exports and responses below to manage follow-up.
            </p>
          </div>
        </form>
      </PortalStatusPanel>

      <PortalStatusPanel title="Responses">
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <FoundationInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search participant or email"
          />
        </div>
        <FoundationTableFrame className="overflow-x-auto border-[var(--portal-border)] bg-[var(--portal-surface)]">
          <table className="portal-table">
            <thead>
              <tr className="portal-table-head-row">
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredResponses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="portal-table-cell-muted px-4 py-6 text-center">
                    No responses found.
                  </td>
                </tr>
              ) : (
                filteredResponses.map((row) => (
                  <tr key={row.id} className="portal-table-row">
                    <td className="px-4 py-3">
                      {[row.assessment_invitations?.first_name, row.assessment_invitations?.last_name]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </td>
                    <td className="px-4 py-3">{row.assessment_invitations?.email ?? '—'}</td>
                    <td className="portal-table-cell-muted px-4 py-3">{row.classification_label ?? '—'}</td>
                    <td className="px-4 py-3">{row.score ?? '—'}</td>
                    <td className="portal-table-cell-muted px-4 py-3">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/portal/participants/${row.id}`} className="portal-inline-link">
                        View result
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FoundationTableFrame>
      </PortalStatusPanel>

      <PortalStatusPanel title="Invitation activity">
        <FoundationTableFrame className="overflow-x-auto border-[var(--portal-border)] bg-[var(--portal-surface)]">
          <table className="portal-table">
            <thead>
              <tr className="portal-table-head-row">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="portal-table-cell-muted px-4 py-6 text-center">
                    No invitations yet.
                  </td>
                </tr>
              ) : (
                invitations.slice(0, 25).map((invitation) => (
                  <tr key={invitation.id} className="portal-table-row">
                    <td className="px-4 py-3">{invitation.email}</td>
                    <td className="px-4 py-3">
                      {[invitation.first_name, invitation.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="portal-table-cell-muted px-4 py-3 capitalize">{invitation.status}</td>
                    <td className="portal-table-cell-muted px-4 py-3">
                      {new Date(invitation.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </FoundationTableFrame>
      </PortalStatusPanel>
    </PortalShell>
  )
}
