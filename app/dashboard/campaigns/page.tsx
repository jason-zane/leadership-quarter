'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import { PlusIcon } from '@/components/icons'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { DashboardFilterBar } from '@/components/dashboard/ui/filter-bar'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'

type Campaign = {
  id: string
  name: string
  slug: string
  status: string
  config: CampaignConfig
  created_at: string
  organisations: { id: string; name: string; slug: string } | null
  campaign_assessments: { id: string; survey_id: string; is_active: boolean }[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-700',
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await navigator.clipboard.writeText(`${origin}/assess/c/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-xs font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-strong)]">
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    fetch('/api/admin/campaigns', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body: { campaigns?: Campaign[] }) => {
        setCampaigns(body.campaigns ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const visibleCampaigns = showArchived ? campaigns : campaigns.filter((c) => c.status !== 'archived')
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length
  const archivedCampaigns = campaigns.filter((campaign) => campaign.status === 'archived').length

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessments"
        title="Campaigns"
        description="Launch, monitor, and close assessment campaigns without losing sight of status or ownership."
        actions={(
          <Link
            href="/dashboard/campaigns/new"
            className="foundation-btn foundation-btn-primary foundation-btn-md inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4" />
            New campaign
          </Link>
        )}
      />

      <DashboardKpiStrip
        items={[
          { label: 'Visible now', value: visibleCampaigns.length },
          { label: 'Active', value: activeCampaigns },
          { label: 'Visible archived', value: archivedCampaigns },
        ]}
      />

      <DashboardFilterBar>
        <div>
          <p className="admin-filter-copy">
            Keep the default view focused on live work, then reveal archived campaigns only when you need history.
          </p>
        </div>
        <div className="admin-toggle-group" role="tablist" aria-label="Campaign visibility">
          <button
            type="button"
            onClick={() => setShowArchived(false)}
            className={['admin-toggle-chip', showArchived ? '' : 'admin-toggle-chip-active'].filter(Boolean).join(' ')}
          >
            Active view
          </button>
          <button
            type="button"
            onClick={() => setShowArchived(true)}
            className={['admin-toggle-chip', showArchived ? 'admin-toggle-chip-active' : ''].filter(Boolean).join(' ')}
          >
            Include archived
          </button>
        </div>
      </DashboardFilterBar>

      <DashboardDataTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Organisation</th>
              <th className="px-4 py-3 font-medium">Assessments</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--admin-text-soft)]">Loading campaigns...</td></tr>
            ) : visibleCampaigns.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--admin-text-soft)]">{showArchived ? 'No campaigns yet.' : 'No active campaigns. Switch to “Include archived” to review closed work.'}</td></tr>
            ) : (
              visibleCampaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-[rgba(103,127,159,0.12)]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="font-medium text-[var(--admin-text-primary)] hover:underline"
                    >
                      {campaign.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">{campaign.organisations?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                    {campaign.campaign_assessments.filter((a) => a.is_active).length}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[var(--admin-text-muted)]">/assess/c/{campaign.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[campaign.status] ?? statusColors.draft}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CopyLinkButton slug={campaign.slug} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
