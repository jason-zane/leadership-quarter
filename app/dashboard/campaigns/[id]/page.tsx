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
  const organisationLabel = campaign.organisations?.name ?? 'Public'
  const demographicsLabel = campaign.config.demographics_enabled ? 'Enabled' : 'Disabled'
  const entryLimitLabel = campaign.config.entry_limit ? String(campaign.config.entry_limit) : 'Unlimited'

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title={campaign.name}
        description="Status, launch readiness, assessment delivery, and the candidate journey in one place."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/campaigns/${campaignId}/journey`} className="foundation-btn foundation-btn-primary foundation-btn-md">
              Open journey builder
            </Link>
            <Link href={`/dashboard/campaigns/${campaignId}/settings`} className="foundation-btn foundation-btn-secondary foundation-btn-md">
              Open settings
            </Link>
            <Link href={`/dashboard/campaigns/${campaignId}/responses`} className="foundation-btn foundation-btn-secondary foundation-btn-md">
              Open responses
            </Link>
          </div>
        )}
      />

      <DashboardKpiStrip
        items={[
          { label: 'Status', value: campaign.status },
          { label: 'Assessments', value: activeAssessments },
          { label: 'Responses', value: responseCount ?? '-' },
          { label: 'Organisation', value: organisationLabel },
        ]}
      />

      <CampaignStatusBar
        status={campaign.status}
        transitions={transitions}
        saving={saving}
        assessments={inviteAssessments}
        onSetStatus={setStatus}
        onInvited={reloadCampaign}
      />

      <div className="mt-6 space-y-6">
        <FoundationSurface className="p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Campaign state</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">Control room</h2>
                <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                  This campaign is {campaign.status}. Journey owns candidate-facing screen order and copy, while Settings owns campaign rules, branding, and field collection.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(246,248,251,0.72)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Registration</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--admin-text-primary)] capitalize">{campaign.config.registration_position}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(246,248,251,0.72)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Report access</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--admin-text-primary)] capitalize">{campaign.config.report_access}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(246,248,251,0.72)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Demographics</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--admin-text-primary)]">{demographicsLabel}</p>
                </div>
                <div className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(246,248,251,0.72)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Entry limit</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--admin-text-primary)]">{entryLimitLabel}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Link
                  href={`/dashboard/campaigns/${campaignId}/journey`}
                  className="rounded-[1.3rem] border border-[rgba(103,127,159,0.14)] bg-white p-4 text-sm font-medium text-[var(--admin-text-primary)] hover:border-[rgba(103,127,159,0.28)]"
                >
                  Journey
                  <span className="mt-1 block text-xs font-normal text-[var(--admin-text-muted)]">Reorder pages, edit candidate screens, manage assessment delivery.</span>
                </Link>
                <Link
                  href={`/dashboard/campaigns/${campaignId}/settings`}
                  className="rounded-[1.3rem] border border-[rgba(103,127,159,0.14)] bg-white p-4 text-sm font-medium text-[var(--admin-text-primary)] hover:border-[rgba(103,127,159,0.28)]"
                >
                  Settings
                  <span className="mt-1 block text-xs font-normal text-[var(--admin-text-muted)]">Identity, branding, registration rules, and demographic field selection.</span>
                </Link>
                <Link
                  href={`/dashboard/campaigns/${campaignId}/responses`}
                  className="rounded-[1.3rem] border border-[rgba(103,127,159,0.14)] bg-white p-4 text-sm font-medium text-[var(--admin-text-primary)] hover:border-[rgba(103,127,159,0.28)]"
                >
                  Responses
                  <span className="mt-1 block text-xs font-normal text-[var(--admin-text-muted)]">Candidate journeys, submissions, and response detail.</span>
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <CampaignUrlCard campaignUrl={campaignUrl} status={campaign.status} />
              <FoundationSurface className="p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Campaign detail</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[var(--admin-text-muted)]">Created</dt>
                    <dd className="font-medium text-[var(--admin-text-primary)]">{createdAt}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[var(--admin-text-muted)]">Public scope</dt>
                    <dd className="font-medium text-[var(--admin-text-primary)]">{organisationLabel}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[var(--admin-text-muted)]">Attached assessments</dt>
                    <dd className="font-medium text-[var(--admin-text-primary)]">{activeAssessments}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-[var(--admin-text-muted)]">Responses recorded</dt>
                    <dd className="font-medium text-[var(--admin-text-primary)]">{responseCount ?? '-'}</dd>
                  </div>
                </dl>
              </FoundationSurface>
            </div>
          </div>
        </FoundationSurface>
      </div>
    </DashboardPageShell>
  )
}
