'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Campaign = {
  id: string
  name: string
  slug: string
  status: 'draft' | 'active' | 'closed' | 'archived'
  config: Record<string, unknown>
}

const statusOptions: Campaign['status'][] = ['draft', 'active', 'closed', 'archived']
const allowedStatusTransitions: Record<Campaign['status'], Campaign['status'][]> = {
  draft: ['active', 'archived'],
  active: ['closed', 'archived'],
  closed: ['archived'],
  archived: [],
}

export default function PortalCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaignId, setCampaignId] = useState('')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState<Campaign['status']>('draft')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
    setLoading(true)
    const res = await fetch(`/api/portal/campaigns/${campaignId}`, { cache: 'no-store' })
    const body = (await res.json()) as { campaign?: Campaign }
    setCampaign(body.campaign ?? null)
    setName(body.campaign?.name ?? '')
    setStatus(body.campaign?.status ?? 'draft')
    setLoading(false)
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

  async function save() {
    if (!campaignId) return
    setSaving(true)
    setSaveError(null)
    const res = await fetch(`/api/portal/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, status }),
    })
    const body = (await res.json()) as { ok?: boolean; message?: string; error?: string }
    if (!res.ok || !body.ok) {
      setSaveError(body.message ?? body.error ?? 'Failed to update campaign.')
      setSaving(false)
      return
    }
    await load()
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading...</p>
  }

  if (!campaign) {
    return <p className="text-sm text-zinc-500">Campaign not found.</p>
  }

  const currentStatus = campaign.status
  const allowedNext = new Set([currentStatus, ...(allowedStatusTransitions[currentStatus] ?? [])])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{campaign.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Slug: {campaign.slug}</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/portal/campaigns/${campaign.id}/invitations`} className="text-sm underline">
            Invitations
          </Link>
          <Link href={`/portal/campaigns/${campaign.id}/responses`} className="text-sm underline">
            Responses
          </Link>
          <Link href={`/portal/campaigns/${campaign.id}/analytics`} className="text-sm underline">
            Analytics
          </Link>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Campaign settings</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Campaign['status'])}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm capitalize dark:border-zinc-700 dark:bg-zinc-800"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option} disabled={!allowedNext.has(option)}>
                {option}
              </option>
            ))}
          </select>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Allowed transitions from <strong>{currentStatus}</strong>: {allowedStatusTransitions[currentStatus].join(', ') || 'none'}.
        </p>
        {saveError ? <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p> : null}
      </section>
    </div>
  )
}
