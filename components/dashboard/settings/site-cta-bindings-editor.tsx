'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'

type Binding = {
  slot: 'ai_readiness_orientation_primary' | 'ai_readiness_orientation_secondary'
  campaign_slug: string | null
}

type CampaignOption = {
  slug: string
  name: string
  status: string
}

const SLOT_META: Record<Binding['slot'], { label: string; description: string }> = {
  ai_readiness_orientation_primary: {
    label: 'AI Orientation primary CTA',
    description: 'Main public-site conversion point for the AI Orientation Survey.',
  },
  ai_readiness_orientation_secondary: {
    label: 'AI Orientation secondary CTA',
    description: 'Secondary placement used where a lighter-intent survey prompt is shown.',
  },
}

export function SiteCtaBindingsEditor() {
  const [bindings, setBindings] = useState<Binding[]>([])
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const { isDirty, markSaved } = useUnsavedChanges(bindings)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError(null)

      const [bindingsRes, campaignsRes] = await Promise.all([
        fetch('/api/admin/site/cta-bindings', { cache: 'no-store' }).catch(() => null),
        fetch('/api/admin/campaigns?scope=lq', { cache: 'no-store' }).catch(() => null),
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
      markSaved(bindingsBody.bindings)
      setSavedAt(null)
      setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [markSaved])

  const connectedCount = useMemo(() => bindings.filter((row) => row.campaign_slug).length, [bindings])
  const hiddenCount = bindings.length - connectedCount

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
      markSaved(body.bindings)
      setSavedAt(new Date().toLocaleTimeString())
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading CTA mapping...</p>
  }

  return (
    <div className="space-y-4">
      <FoundationSurface className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Website CTA routing</h2>
            <p className="mt-1 max-w-3xl text-sm text-[var(--admin-text-muted)]">
              Map public site conversion points to active Leadership Quarter campaigns. This affects public CTA entry only, not invitation links or campaign-specific landing pages.
            </p>
          </div>
          <div className="text-right">
            {isDirty ? <p className="text-xs font-medium text-amber-700">Unsaved changes</p> : null}
            {!isDirty && savedAt ? <p className="text-xs text-emerald-600">Saved at {savedAt}</p> : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard label="CTA slots" value={bindings.length} />
          <MetricCard label="Connected" value={connectedCount} />
          <MetricCard label="Hidden" value={hiddenCount} />
          <MetricCard label="Active campaigns" value={campaigns.length} />
        </div>

        {campaigns.length === 0 ? (
          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No active Leadership Quarter campaigns are available. Activate a campaign before assigning a website CTA slot.
          </div>
        ) : null}
      </FoundationSurface>

      <div className="space-y-3">
        {bindings.map((row) => {
          const meta = SLOT_META[row.slot]
          const selectedCampaign = campaigns.find((campaign) => campaign.slug === row.campaign_slug)
          return (
            <FoundationSurface key={row.slot} className="p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">{meta.label}</h3>
                    <span
                      className={[
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
                        row.campaign_slug
                          ? 'bg-[rgba(47,95,153,0.14)] text-[var(--admin-accent-strong)]'
                          : 'bg-[var(--admin-surface-alt)] text-[var(--admin-text-soft)]',
                      ].join(' ')}
                    >
                      {row.campaign_slug ? 'Linked' : 'Hidden'}
                    </span>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--admin-text-muted)]">{meta.description}</p>

                  <div className="mt-4 rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">
                      Target campaign
                    </label>
                    <select
                      value={row.campaign_slug ?? ''}
                      onChange={(event) => setBinding(row.slot, event.target.value || null)}
                      className="foundation-field mt-3"
                    >
                      <option value="">No campaign - hide this CTA</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.slug} value={campaign.slug}>
                          {campaign.name} ({campaign.slug})
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-[var(--admin-text-muted)]">Only active Leadership Quarter campaigns are eligible here.</p>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">Live outcome</p>
                  {selectedCampaign ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{selectedCampaign.name}</p>
                      <p className="font-mono text-xs text-[var(--admin-text-muted)]">Slug: {selectedCampaign.slug}</p>
                      <p className="text-sm leading-6 text-[var(--admin-text-muted)]">
                        Visitors using this CTA will enter the active campaign flow for <span className="font-medium text-[var(--admin-text-primary)]">{selectedCampaign.slug}</span>.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-[var(--admin-text-muted)]">
                      This CTA is currently hidden from the website because no active campaign is assigned.
                    </p>
                  )}
                </div>
              </div>
            </FoundationSurface>
          )
        })}
      </div>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="flex justify-end">
        <FoundationButton type="button" variant="primary" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving...' : 'Save CTA mapping'}
        </FoundationButton>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">{value}</p>
    </div>
  )
}
