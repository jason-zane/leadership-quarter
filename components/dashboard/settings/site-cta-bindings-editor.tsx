'use client'

import { useEffect, useState } from 'react'

type Binding = {
  slot: 'ai_readiness_orientation_primary' | 'ai_readiness_orientation_secondary'
  campaign_slug: string | null
}

type CampaignOption = {
  slug: string
  name: string
  status: string
}

const SLOT_LABELS: Record<Binding['slot'], string> = {
  ai_readiness_orientation_primary: 'AI Readiness Primary CTA',
  ai_readiness_orientation_secondary: 'AI Readiness Secondary CTA',
}

export function SiteCtaBindingsEditor() {
  const [bindings, setBindings] = useState<Binding[]>([])
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)

      const [bindingsRes, campaignsRes] = await Promise.all([
        fetch('/api/admin/site/cta-bindings', { cache: 'no-store' }).catch(() => null),
        fetch('/api/admin/campaigns', { cache: 'no-store' }).catch(() => null),
      ])

      const bindingsBody = (await bindingsRes?.json().catch(() => null)) as { ok?: boolean; bindings?: Binding[] } | null
      const campaignsBody = (await campaignsRes?.json().catch(() => null)) as
        | { campaigns?: Array<{ slug: string; name: string; status: string }> }
        | null

      if (!mounted) return

      if (!bindingsRes?.ok || !bindingsBody?.ok || !bindingsBody.bindings) {
        setError('Could not load CTA mapping settings.')
        setLoading(false)
        return
      }

      setBindings(bindingsBody.bindings)
      setCampaigns((campaignsBody?.campaigns ?? []).filter((campaign) => campaign.status === 'active'))
      setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  function setBinding(slot: Binding['slot'], campaign_slug: string | null) {
    setBindings((prev) => prev.map((row) => (row.slot === slot ? { ...row, campaign_slug } : row)))
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSavedAt(null)

    try {
      const response = await fetch('/api/admin/site/cta-bindings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bindings }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; bindings?: Binding[] } | null
      if (!response.ok || !body?.ok || !body.bindings) {
        setError(body?.error ?? 'Failed to save CTA mapping.')
        return
      }

      setBindings(body.bindings)
      setSavedAt(new Date().toLocaleTimeString())
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading CTA mapping...</p>
  }

  return (
    <div className="space-y-4">
      {bindings.map((row) => (
        <label key={row.slot} className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {SLOT_LABELS[row.slot]}
          </span>
          <select
            value={row.campaign_slug ?? ''}
            onChange={(event) => setBinding(row.slot, event.target.value || null)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">Fallback to public assessment</option>
            {campaigns.map((campaign) => (
              <option key={campaign.slug} value={campaign.slug}>
                {campaign.name} ({campaign.slug})
              </option>
            ))}
          </select>
        </label>
      ))}

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {savedAt ? <p className="text-xs text-emerald-600">Saved at {savedAt}</p> : null}

      <div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? 'Saving...' : 'Save CTA mapping'}
        </button>
      </div>
    </div>
  )
}

