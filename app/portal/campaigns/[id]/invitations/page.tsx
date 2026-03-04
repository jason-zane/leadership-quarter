'use client'

import { useCallback, useEffect, useState } from 'react'

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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Invitations</h1>

      <form onSubmit={submit} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email@company.com"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            Add invite
          </button>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} />
          Send invitation email now
        </label>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => (
              <tr key={invitation.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-3">{invitation.email}</td>
                <td className="px-4 py-3">{[invitation.first_name, invitation.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="px-4 py-3 capitalize">{invitation.status}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(invitation.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
