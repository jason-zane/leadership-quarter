'use client'

import { useCallback, useEffect, useState } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput } from '@/components/ui/foundation/field'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalHeader } from '@/components/portal/ui/portal-header'
import { PortalStatusPanel } from '@/components/portal/ui/status-panel'

type Invitation = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string
  created_at: string
}

export default function PortalCampaignInvitationsPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaignId, setCampaignId] = useState('')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [send, setSend] = useState(true)

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
    const res = await fetch(`/api/portal/campaigns/${campaignId}/invitations`, { cache: 'no-store' })
    const body = (await res.json()) as { invitations?: Invitation[] }
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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!campaignId) return

    await fetch(`/api/portal/campaigns/${campaignId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        send,
        invitations: [{ email, firstName, lastName }],
      }),
    })

    setEmail('')
    setFirstName('')
    setLastName('')
    await load()
  }

  return (
    <PortalShell>
      <PortalHeader title="Invitations" description="Manage participant invitations for this campaign." />

      <PortalStatusPanel title="Add invitation">
        <form onSubmit={submit} className="space-y-3">
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
          <FoundationButton type="submit" variant="primary">
            Add invite
          </FoundationButton>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} />
          Send invitation email now
        </label>
        </form>
      </PortalStatusPanel>

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
            {invitations.map((invitation) => (
              <tr key={invitation.id} className="portal-table-row">
                <td className="px-4 py-3">{invitation.email}</td>
                <td className="px-4 py-3">{[invitation.first_name, invitation.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="portal-table-cell-muted px-4 py-3 capitalize">{invitation.status}</td>
                <td className="portal-table-cell-muted px-4 py-3">{new Date(invitation.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FoundationTableFrame>
    </PortalShell>
  )
}
