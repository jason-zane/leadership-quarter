'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import type { CampaignStatus } from '@/utils/assessments/campaign-types'
import { CampaignActionsCard } from './_components/campaign-actions-card'
import { CampaignAssessmentDeliveryPanel } from './_components/campaign-assessment-delivery-panel'
import { getPublicCampaignUrl } from '@/utils/public-site-url'
import {
  STATUS_TRANSITIONS,
  statusColors,
  type Campaign,
} from './_lib/campaign-overview'

type CampaignResponse = {
  campaign?: Campaign
}

type CampaignResponsesResponse = {
  responses?: unknown[]
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(103,127,159,0.1)] py-4 last:border-b-0 last:pb-0">
      <dt className="text-sm text-[var(--admin-text-muted)]">{label}</dt>
      <dd className="text-sm font-medium text-[var(--admin-text-primary)]">{value}</dd>
    </div>
  )
}

export default function CampaignOverviewPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [responseCount, setResponseCount] = useState<number | null>(null)

  const reloadCampaign = useCallback(async () => {
    const [campaignRes, responsesRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as CampaignResponse
    setCampaign(campaignBody.campaign ?? null)
    if (responsesRes.ok) {
      const responsesBody = (await responsesRes.json()) as CampaignResponsesResponse
      setResponseCount(responsesBody.responses?.length ?? 0)
    }
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      await reloadCampaign()
      if (!active) return
    }
    void load()
    return () => { active = false }
  }, [reloadCampaign])

  async function setStatus(status: CampaignStatus) {
    setSaving(true)
    await fetch(`/api/admin/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await reloadCampaign()
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading...</p>
  }

  if (!campaign) {
    return <p className="text-sm text-red-500">Campaign not found.</p>
  }

  const transitions = STATUS_TRANSITIONS[campaign.status] ?? []
  const campaignUrl = getPublicCampaignUrl(
    campaign.slug,
    campaign.organisations?.slug
  )
  const createdAt = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(campaign.created_at))
  const organisationLabel = campaign.organisations?.name ?? 'Public'

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title={campaign.name}
        actions={(
          <span className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${statusColors[campaign.status] ?? statusColors.draft}`}>
            {campaign.status}
          </span>
        )}
      />

      <div className="mt-6 space-y-6">
        <CampaignActionsCard
          status={campaign.status}
          transitions={transitions}
          saving={saving}
          campaignId={campaignId}
          campaignUrl={campaignUrl}
          onSetStatus={setStatus}
          onInvited={reloadCampaign}
        />

        <CampaignAssessmentDeliveryPanel campaignId={campaignId} />

        <FoundationSurface className="space-y-5 p-6 md:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Current setup at a glance</p>

          <dl>
            <DetailRow label="Created" value={createdAt} />
            <DetailRow label="Owning client" value={organisationLabel} />
            <DetailRow label="Registration" value={campaign.config.registration_position} />
            <DetailRow label="Report access" value={campaign.config.report_access} />
            <DetailRow label="Demographics" value={campaign.config.demographics_enabled ? 'Enabled' : 'Disabled'} />
            <DetailRow label="Campaign entry limit" value={campaign.config.entry_limit ? String(campaign.config.entry_limit) : 'Unlimited'} />
            <DetailRow label="Responses recorded" value={responseCount ?? '-'} />
          </dl>
        </FoundationSurface>
      </div>
    </DashboardPageShell>
  )
}
