'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import type { CampaignStatus } from '@/utils/assessments/campaign-types'
import { CampaignStatusBar } from './_components/campaign-status-bar'
import { CampaignUrlCard } from './_components/campaign-url-card'
import { getPublicCampaignUrl } from '@/utils/public-site-url'
import {
  STATUS_TRANSITIONS,
  type Campaign,
} from './_lib/campaign-overview'

type CampaignResponse = {
  campaign?: Campaign
}

type CampaignResponsesResponse = {
  responses?: unknown[]
}

type OverviewTab = 'summary' | 'assessments'

const OVERVIEW_TABS: Array<{ key: OverviewTab; label: string }> = [
  { key: 'summary', label: 'Summary' },
  { key: 'assessments', label: 'Assessments' },
]

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
  const [activeTab, setActiveTab] = useState<OverviewTab>('summary')

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

  const activeAssessments = campaign.campaign_assessments.filter((assessment) => assessment.is_active).length
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
  const brandSourceLabel =
    campaign.config.branding_mode === 'lq'
      ? 'Leadership Quarter'
      : campaign.config.branding_mode === 'none'
        ? 'Header hidden'
        : campaign.branding_source_organisation?.name
          ?? campaign.organisations?.name
          ?? 'Selected client brand'
  const primaryActionClass =
    'inline-flex h-11 items-center rounded-full bg-[var(--admin-text-primary)] px-5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(21,31,49,0.16)] transition hover:-translate-y-px hover:bg-[var(--admin-accent-strong)]'
  const secondaryActionClass =
    'inline-flex h-11 items-center rounded-full border border-[rgba(103,127,159,0.18)] bg-white px-5 text-sm font-semibold text-[var(--admin-text-primary)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-px hover:border-[rgba(103,127,159,0.28)] hover:bg-[rgba(248,250,253,0.96)]'

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title={campaign.name}
        description="Keep launch state, delivery, and campaign setup tidy here. Journey owns the participant sequence. Settings owns brand application and audience rules."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/campaigns/${campaignId}/journey`} className={primaryActionClass}>
              Open journey
            </Link>
            <Link href={`/dashboard/campaigns/${campaignId}/settings`} className={secondaryActionClass}>
              Campaign settings
            </Link>
            <Link href={`/dashboard/campaigns/${campaignId}/responses`} className={secondaryActionClass}>
              Responses
            </Link>
          </div>
        )}
      />

      <DashboardKpiStrip
        items={[
          { label: 'Status', value: campaign.status, hint: 'Launch state' },
          { label: 'Assessments', value: activeAssessments, hint: 'Currently attached' },
          { label: 'Responses', value: responseCount ?? '-', hint: 'Captured so far' },
          { label: 'Organisation', value: organisationLabel, hint: 'Owning client' },
        ]}
      />

      <div className="mt-6 space-y-6">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Campaign overview sections">
          {OVERVIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'admin-toggle-chip admin-toggle-chip-active' : 'admin-toggle-chip'}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'summary' ? (
          <div className="space-y-6">
            <FoundationSurface className="space-y-5 p-6 md:p-7">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Campaign control room</p>
                <h2 className="mt-2 font-serif text-[clamp(1.7rem,3.2vw,2.5rem)] leading-[1.02] text-[var(--admin-text-primary)]">
                  Launch state and participant delivery without the clutter
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
                  Use this summary tab to check whether the campaign is ready to share, which client brand it applies, and what the current participant rules look like.
                </p>
              </div>

              <CampaignStatusBar
                status={campaign.status}
                transitions={transitions}
                saving={saving}
                campaignId={campaignId}
                onSetStatus={setStatus}
                onInvited={reloadCampaign}
              />
            </FoundationSurface>

            <CampaignUrlCard campaignUrl={campaignUrl} status={campaign.status} />

            <FoundationSurface className="space-y-5 p-6 md:p-7">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Campaign detail</p>
                <h2 className="mt-2 font-serif text-[1.7rem] leading-[1.04] text-[var(--admin-text-primary)]">Current setup at a glance</h2>
              </div>

              <dl>
                <DetailRow label="Created" value={createdAt} />
                <DetailRow label="Owning client" value={organisationLabel} />
                <DetailRow label="Brand source" value={brandSourceLabel} />
                <DetailRow label="Registration" value={campaign.config.registration_position} />
                <DetailRow label="Report access" value={campaign.config.report_access} />
                <DetailRow label="Demographics" value={campaign.config.demographics_enabled ? 'Enabled' : 'Disabled'} />
                <DetailRow label="Assessment limit" value={campaign.config.entry_limit ? String(campaign.config.entry_limit) : 'Unlimited'} />
                <DetailRow label="Attached assessments" value={activeAssessments} />
                <DetailRow label="Responses recorded" value={responseCount ?? '-'} />
              </dl>
            </FoundationSurface>
          </div>
        ) : null}

        {activeTab === 'assessments' ? (
          <FoundationSurface className="space-y-5 p-6 md:p-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Attached assessments</p>
              <h2 className="mt-2 font-serif text-[1.7rem] leading-[1.04] text-[var(--admin-text-primary)]">Assessments in this campaign</h2>
              <p className="mt-2 max-w-3xl text-sm text-[var(--admin-text-muted)]">
                These are the assessments attached to this campaign. Manage the participant sequence in the journey editor.
              </p>
            </div>

            {campaign.campaign_assessments.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No assessments attached yet.</p>
            ) : (
              <ul className="divide-y divide-[rgba(103,127,159,0.1)]">
                {campaign.campaign_assessments.map((ca) => (
                  <li key={ca.id} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">
                      {ca.assessments?.name ?? 'Unknown assessment'}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ca.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {ca.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </FoundationSurface>
        ) : null}
      </div>
    </DashboardPageShell>
  )
}
