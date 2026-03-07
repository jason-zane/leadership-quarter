'use client'

import { useEffect, useMemo, useState } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput, FoundationSelect } from '@/components/ui/foundation/field'
import { PortalHeader } from '@/components/portal/ui/portal-header'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalStatusPanel } from '@/components/portal/ui/status-panel'

type CampaignOption = {
  id: string
  name: string
}

type PortalContext = {
  email: string | null
  organisationSlug: string
}

type HelpResponse =
  | { ok: true; requestId: string }
  | { ok: false; error: string; message: string }

export default function PortalHelpPage() {
  const [context, setContext] = useState<PortalContext | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      const [meRes, campaignsRes] = await Promise.all([
        fetch('/api/portal/me', { cache: 'no-store' }),
        fetch('/api/portal/campaigns?pageSize=100', { cache: 'no-store' }),
      ])

      const meBody = (await meRes.json().catch(() => null)) as { context?: PortalContext } | null
      const campaignBody = (await campaignsRes.json().catch(() => null)) as { campaigns?: CampaignOption[] } | null

      if (!mounted) return
      setContext(meBody?.context ?? null)
      setCampaigns(campaignBody?.campaigns ?? [])
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const canSubmit = useMemo(
    () => topic.trim().length > 0 && topic.trim().length <= 120 && message.trim().length > 0 && message.trim().length <= 4000,
    [topic, message]
  )

  async function submitSupport(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/portal/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          message: message.trim(),
          campaign_id: campaignId || null,
        }),
      })

      const body = (await res.json().catch(() => null)) as HelpResponse | null
      if (!res.ok || !body?.ok) {
        setError(body && !body.ok ? body.message : 'Could not send your support request. Please try again.')
        setSubmitting(false)
        return
      }

      setSuccess('Support request sent. We will reply by email shortly.')
      setTopic('')
      setMessage('')
      setCampaignId('')
    } catch {
      setError('Network error. Please try again.')
    }

    setSubmitting(false)
  }

  return (
    <PortalShell>
      <PortalHeader
        title="Help & Support"
        description="Send us any issue and we’ll get back to you by email."
      />

      <PortalStatusPanel title="Contact support">
        <form onSubmit={submitSupport} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--portal-text-soft)]">Topic</span>
            <FoundationInput
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={120}
              placeholder="Issue summary"
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--portal-text-soft)]">Related campaign (optional)</span>
            <FoundationSelect value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>
              <option value="">No specific campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </FoundationSelect>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--portal-text-soft)]">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={4000}
              required
              className="foundation-field min-h-40 w-full"
              placeholder="Describe what happened, what you expected, and any steps to reproduce."
            />
          </label>

          <div className="grid gap-2 rounded-lg bg-[var(--portal-surface-alt)] p-3 text-sm text-[var(--portal-text-primary)] md:grid-cols-2">
            <p>
              <span className="text-xs uppercase tracking-[0.08em] text-[var(--portal-text-soft)]">Your email</span>
              <br />
              {context?.email ?? '—'}
            </p>
            <p>
              <span className="text-xs uppercase tracking-[0.08em] text-[var(--portal-text-soft)]">Organisation</span>
              <br />
              {context?.organisationSlug ?? '—'}
            </p>
          </div>

          {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href="mailto:support@leadershipquarter.com" className="text-sm text-[var(--portal-accent)] hover:text-[var(--portal-accent-strong)]">
              Prefer email? support@leadershipquarter.com
            </a>
            <FoundationButton type="submit" variant="primary" disabled={!canSubmit || submitting}>
              {submitting ? 'Sending...' : 'Send support request'}
            </FoundationButton>
          </div>
        </form>
      </PortalStatusPanel>
    </PortalShell>
  )
}
