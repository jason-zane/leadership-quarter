'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import type { CampaignStatus } from '@/utils/assessments/campaign-types'
import { CampaignStatusBar } from './_components/campaign-status-bar'
import { CampaignStatsGrid } from './_components/campaign-stats-grid'
import { CampaignUrlCard } from './_components/campaign-url-card'
import { CampaignSummaryCard } from './_components/campaign-summary-card'
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

  const activeAssessments = campaign.campaign_assessments.filter((a) => a.is_active).length
  const transitions = STATUS_TRANSITIONS[campaign.status] ?? []
  const inviteAssessments = campaign.campaign_assessments
    .filter((a) => a.assessments)
    .map((a) => ({ id: a.assessment_id, name: a.assessments!.name }))
  const campaignUrl = getPublicCampaignUrl(
    campaign.slug,
    campaign.organisations?.slug
  )
  const createdAt = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(campaign.created_at))

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title={campaign.name}
        description="Campaign summary and quick access to configuration."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/campaigns/${campaignId}/journey`} className="foundation-btn foundation-btn-primary foundation-btn-md">
              Open journey builder
            </Link>
            <Link href={`/dashboard/campaigns/${campaignId}/responses`} className="foundation-btn foundation-btn-secondary foundation-btn-md">
              Open responses
            </Link>
          </div>
        )}
      />

      <CampaignStatusBar
        status={campaign.status}
        transitions={transitions}
        saving={saving}
        assessments={inviteAssessments}
        onSetStatus={setStatus}
        onInvited={reloadCampaign}
      />

      <CampaignStatsGrid
        campaignId={campaignId}
        activeAssessments={activeAssessments}
        organisationName={campaign.organisations?.name ?? 'Public'}
        registrationPosition={campaign.config.registration_position}
        responseCount={responseCount}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6">
          <FoundationSurface className="p-6">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Quick links</h2>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">Jump to campaign configuration sections.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href={`/dashboard/campaigns/${campaignId}/settings`}
                className="rounded-xl border border-[rgba(103,127,159,0.14)] bg-white/70 p-4 text-sm font-medium text-[var(--admin-text-primary)] hover:border-[rgba(103,127,159,0.28)]"
              >
                Settings
                <span className="mt-1 block text-xs font-normal text-[var(--admin-text-muted)]">Name, organisation, registration, branding</span>
              </Link>
              <Link
                href={`/dashboard/campaigns/${campaignId}/journey`}
                className="rounded-xl border border-[rgba(103,127,159,0.14)] bg-white/70 p-4 text-sm font-medium text-[var(--admin-text-primary)] hover:border-[rgba(103,127,159,0.28)]"
              >
                Journey
                <span className="mt-1 block text-xs font-normal text-[var(--admin-text-muted)]">Page sequence, assessment order, registration, completion</span>
              </Link>
              <Link
                href={`/dashboard/campaigns/${campaignId}/responses`}
                className="rounded-xl border border-[rgba(103,127,159,0.14)] bg-white/70 p-4 text-sm font-medium text-[var(--admin-text-primary)] hover:border-[rgba(103,127,159,0.28)]"
              >
                Responses
                <span className="mt-1 block text-xs font-normal text-[var(--admin-text-muted)]">Submissions and participant data</span>
              </Link>
            </div>
          </FoundationSurface>
        </div>

        <div className="space-y-6">
          <CampaignUrlCard campaignUrl={campaignUrl} status={campaign.status} />
          <CampaignSummaryCard
            reportAccess={campaign.config.report_access}
            demographicsEnabled={campaign.config.demographics_enabled}
            entryLimit={campaign.config.entry_limit ?? null}
            createdAt={createdAt}
          />
        </div>
      </div>
    </DashboardPageShell>
  )
}
