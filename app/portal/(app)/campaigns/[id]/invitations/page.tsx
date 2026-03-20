'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { PortalCampaignWorkspaceHeader } from '@/components/portal/campaign-workspace-header'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput } from '@/components/ui/foundation/field'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalStatusPanel } from '@/components/portal/ui/status-panel'

type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'
type Campaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
}

type Invitation = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  created_at: string
}

type InviteDraft = {
  email: string
  first_name?: string
  last_name?: string
}

function parseRows(input: string): InviteDraft[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, firstName, lastName] = line.split(',').map((item) => item.trim())
      return {
        email: email?.toLowerCase() ?? '',
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      }
    })
    .filter((row) => row.email.includes('@'))
}

export default function PortalCampaignInvitationsPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaignId, setCampaignId] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bulkRows, setBulkRows] = useState('')
  const [send, setSend] = useState(true)
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const parsedBulk = useMemo(() => parseRows(bulkRows), [bulkRows])
  const bulkNonEmptyLines = useMemo(
    () => bulkRows.split('\n').map((line) => line.trim()).filter(Boolean).length,
    [bulkRows]
  )
  const bulkIgnored = Math.max(0, bulkNonEmptyLines - parsedBulk.length)

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
    const [campaignRes, invitationsRes] = await Promise.all([
      fetch(`/api/portal/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/portal/campaigns/${campaignId}/invitations`, { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as { campaign?: Campaign }
    const body = (await invitationsRes.json()) as { invitations?: Invitation[] }
    setCampaign(campaignBody.campaign ?? null)
    setInvitations(body.invitations ?? [])
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
    setError(null)
    try {
      const res = await fetch(`/api/portal/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const body = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok || !body.ok) {
        setError(body.message ?? body.error ?? 'Failed to update campaign status.')
        return
      }
      await load()
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!campaignId) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    const invitationsPayload =
      mode === 'single'
        ? [
            {
              email: email.trim().toLowerCase(),
              first_name: firstName.trim() || undefined,
              last_name: lastName.trim() || undefined,
            },
          ]
        : parsedBulk

    if (invitationsPayload.length === 0) {
      setError('Add at least one valid invitation.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/portal/campaigns/${campaignId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          send_now: send,
          invitations: invitationsPayload,
        }),
      })

      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null
      if (!res.ok || !body?.ok) {
        setError(body?.message ?? body?.error ?? 'Failed to add invitations.')
        setSaving(false)
        return
      }

      setEmail('')
      setFirstName('')
      setLastName('')
      setBulkRows('')
      setSuccess(mode === 'single' ? 'Invitation added.' : `Added ${invitationsPayload.length} invitations.`)
      await load()
    } catch {
      setError('Network error. Please try again.')
    }

    setSaving(false)
  }

  const filtered = invitations.filter((invitation) => {
    if (statusFilter !== 'all' && invitation.status !== statusFilter) return false
    if (!query.trim()) return true
    const q = query.trim().toLowerCase()
    const name = `${invitation.first_name ?? ''} ${invitation.last_name ?? ''}`.toLowerCase()
    return invitation.email.toLowerCase().includes(q) || name.includes(q)
  })

  return (
    <PortalShell>
      {campaign ? (
        <PortalCampaignWorkspaceHeader
          campaign={campaign}
          activeTab="invitations"
          description="Invite participants and track invitation activity in one place."
          updatingStatus={updatingStatus}
          onStatusChange={(status) => {
            void updateStatus(status)
          }}
        />
      ) : null}

      <PortalStatusPanel title="Invite participants">
        <form onSubmit={submit} className="space-y-3">
          <div className="backend-tab-bar">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={['backend-tab-link', mode === 'single' ? 'backend-tab-link-active' : ''].join(' ')}
            >
              Single invite
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={['backend-tab-link', mode === 'bulk' ? 'backend-tab-link-active' : ''].join(' ')}
            >
              Bulk paste
            </button>
          </div>
          <p className="text-xs text-[var(--portal-text-muted)]">
            {mode === 'single'
              ? 'Single invite is best for one participant.'
              : 'Paste one participant per line: email,firstName,lastName'}
          </p>

          {mode === 'single' ? (
            <div className="grid gap-3 md:grid-cols-4">
              <FoundationInput value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@company.com" required />
              <FoundationInput value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
              <FoundationInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
              <FoundationButton type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Add invite'}
              </FoundationButton>
            </div>
          ) : (
            <>
              <textarea
                value={bulkRows}
                onChange={(e) => setBulkRows(e.target.value)}
                className="foundation-field min-h-32 w-full"
                placeholder="email,firstName,lastName"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--portal-text-muted)]">
                  Parsed rows: {parsedBulk.length}
                  {bulkIgnored > 0 ? ` · Ignored lines: ${bulkIgnored}` : ''}
                </p>
                <FoundationButton type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add invites'}
                </FoundationButton>
              </div>
            </>
          )}

          <label className="inline-flex items-center gap-2 rounded-lg bg-[var(--portal-surface-alt)] px-3 py-2 text-sm text-[var(--portal-text-primary)]">
            <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} />
            Send invitation email now
          </label>
          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        </form>
      </PortalStatusPanel>

      <PortalStatusPanel title="Invitation activity">
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          <FoundationInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="foundation-field">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="opened">Opened</option>
            <option value="started">Started</option>
            <option value="completed">Completed</option>
          </select>
          <div className="text-sm text-[var(--portal-text-muted)]">Showing {filtered.length} of {invitations.length}</div>
        </div>

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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--portal-text-muted)]">
                    {invitations.length === 0
                      ? 'No invitations yet. Add your first participant above.'
                      : 'No invitations match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((invitation) => (
                  <tr key={invitation.id} className="portal-table-row">
                    <td className="px-4 py-3">{invitation.email}</td>
                    <td className="px-4 py-3">{[invitation.first_name, invitation.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="portal-table-cell-muted px-4 py-3 capitalize">{invitation.status}</td>
                    <td className="portal-table-cell-muted px-4 py-3">{new Date(invitation.created_at).toLocaleString()}</td>
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
