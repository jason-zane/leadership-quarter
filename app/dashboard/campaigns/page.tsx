'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import { PlusIcon } from '@/components/icons'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { DashboardFilterBar } from '@/components/dashboard/ui/filter-bar'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { getPublicCampaignPath } from '@/utils/campaign-url'
import { getPublicCampaignUrl } from '@/utils/public-site-url'

type CampaignScope = 'all' | 'lq' | 'client'

type Campaign = {
  id: string
  organisation_id: string | null
  name: string
  external_name: string
  slug: string
  status: string
  config: CampaignConfig
  created_at: string
  organisations: { id: string; name: string; slug: string } | null
  campaign_assessments: { id: string; assessment_id: string; is_active: boolean }[]
}

type CampaignListResponse = {
  campaigns?: Campaign[]
}

type MutationResponse = {
  ok?: boolean
  error?: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]',
  active: 'bg-green-100 text-green-700',
  closed: 'bg-yellow-100 text-yellow-700',
  archived: 'bg-red-100 text-red-700',
}

function CopyLinkButton({
  slug,
  organisationSlug,
}: {
  slug: string
  organisationSlug?: string | null
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(getPublicCampaignUrl(slug, organisationSlug))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button onClick={copy} className="text-xs font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-strong)]">
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

function getCampaignScopeLabel(scope: CampaignScope) {
  if (scope === 'lq') return 'Leadership Quarter'
  if (scope === 'client') return 'Client campaigns'
  return 'All campaigns'
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [scope, setScope] = useState<CampaignScope>('all')
  const [search, setSearch] = useState('')
  const [mutatingCampaignId, setMutatingCampaignId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let active = true

    async function loadCampaigns() {
      setLoading(true)
      setError(null)

      const query = new URLSearchParams()
      if (deferredSearch.trim()) query.set('q', deferredSearch.trim())
      if (scope !== 'all') query.set('scope', scope)
      const queryString = query.toString()

      const response = await fetch(`/api/admin/campaigns${queryString ? `?${queryString}` : ''}`, {
        cache: 'no-store',
      }).catch(() => null)
      const body = (await response?.json().catch(() => null)) as CampaignListResponse | null

      if (!active) return

      if (!response?.ok) {
        setCampaigns([])
        setError('Failed to load campaigns.')
        setLoading(false)
        return
      }

      setCampaigns(body?.campaigns ?? [])
      setLoading(false)
    }

    void loadCampaigns()

    return () => {
      active = false
    }
  }, [deferredSearch, scope])

  const visibleCampaigns = showArchived ? campaigns : campaigns.filter((campaign) => campaign.status !== 'archived')
  const activeCampaigns = visibleCampaigns.filter((campaign) => campaign.status === 'active').length
  const archivedCampaigns = campaigns.filter((campaign) => campaign.status === 'archived').length

  async function mutateCampaign(campaign: Campaign, mutation: { status?: string; delete?: boolean }) {
    setMutatingCampaignId(campaign.id)
    setError(null)

    const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
      method: mutation.delete ? 'DELETE' : 'PATCH',
      headers: mutation.delete ? undefined : { 'Content-Type': 'application/json' },
      body: mutation.delete ? undefined : JSON.stringify({ status: mutation.status }),
    })
    const body = (await response.json().catch(() => null)) as MutationResponse | null

    if (!response.ok || !body?.ok) {
      if (body?.error === 'campaign_has_activity') {
        setError('Campaigns with invitations or submissions cannot be deleted. Archive or close them instead.')
      } else {
        setError(mutation.delete ? 'Failed to delete campaign.' : 'Failed to update campaign.')
      }
      setMutatingCampaignId(null)
      return
    }

    setCampaigns((current) =>
      mutation.delete
        ? current.filter((item) => item.id !== campaign.id)
        : current.map((item) =>
            item.id === campaign.id && mutation.status
              ? { ...item, status: mutation.status }
              : item
          )
    )
    setMutatingCampaignId(null)
  }

  function getActionItems(campaign: Campaign): ActionItem[] {
    const organisationSlug = campaign.organisations?.slug ?? null
    const publicUrl = getPublicCampaignUrl(campaign.slug, organisationSlug)
    const busy = mutatingCampaignId === campaign.id

    return [
      {
        type: 'item',
        label: 'Open campaign',
        onSelect: () => router.push(`/dashboard/campaigns/${campaign.id}`),
      },
      {
        type: 'item',
        label: 'Copy link',
        onSelect: () => {
          void navigator.clipboard.writeText(publicUrl)
        },
      },
      { type: 'separator' },
      ...(campaign.status !== 'active'
        ? [{
            type: 'item' as const,
            label: 'Make active',
            onSelect: () => void mutateCampaign(campaign, { status: 'active' }),
            disabled: busy,
          }]
        : []),
      ...(campaign.status === 'active'
        ? [{
            type: 'item' as const,
            label: 'Make inactive',
            onSelect: () => void mutateCampaign(campaign, { status: 'closed' }),
            disabled: busy,
          }]
        : []),
      ...(campaign.status !== 'archived'
        ? [{
            type: 'item' as const,
            label: 'Archive',
            onSelect: () => void mutateCampaign(campaign, { status: 'archived' }),
            disabled: busy,
          }]
        : []),
      { type: 'separator' },
      {
        type: 'item',
        label: 'Delete',
        destructive: true,
        disabled: busy,
        onSelect: () => {
          if (!window.confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return
          void mutateCampaign(campaign, { delete: true })
        },
      },
    ]
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessments"
        title="Campaigns"
        description="Search across campaigns, separate LQ work from client work, and manage lifecycle actions directly from the list."
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
          { label: 'In view', value: visibleCampaigns.length },
          { label: 'Active', value: activeCampaigns },
          { label: 'Archived', value: archivedCampaigns },
        ]}
      />

      <DashboardFilterBar>
        <div className="space-y-3">
          <p className="admin-filter-copy">
            {getCampaignScopeLabel(scope)}. Search matches internal name, public name, slug, and client name.
          </p>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns, slugs, or clients"
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2 text-sm text-[var(--admin-text-primary)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[rgba(82,110,255,0.16)] md:w-[28rem]"
          />
        </div>
        <div className="space-y-3">
          <div className="admin-toggle-group" role="tablist" aria-label="Campaign ownership">
            {([
              ['all', 'All'],
              ['lq', 'Leadership Quarter'],
              ['client', 'Client campaigns'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={scope === value ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="admin-toggle-group" role="tablist" aria-label="Campaign visibility">
            <button
              type="button"
              onClick={() => setShowArchived(false)}
              className={showArchived ? 'admin-toggle-pill' : 'admin-toggle-pill admin-toggle-pill-active'}
            >
              Active view
            </button>
            <button
              type="button"
              onClick={() => setShowArchived(true)}
              className={showArchived ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
            >
              Include archived
            </button>
          </div>
        </div>
      </DashboardFilterBar>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <DashboardDataTableShell>
        <table className="admin-data-table">
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium">Assessments</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Quick link</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="admin-data-table-empty"><td colSpan={7}>Loading campaigns...</td></tr>
            ) : visibleCampaigns.length === 0 ? (
              <tr className="admin-data-table-empty"><td colSpan={7}>{showArchived ? 'No campaigns found for this view.' : 'No active campaigns match this view.'}</td></tr>
            ) : (
              visibleCampaigns.map((campaign) => {
                const publicPath = getPublicCampaignPath(campaign.slug, campaign.organisations?.slug)
                return (
                  <tr key={campaign.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="font-medium text-[var(--admin-text-primary)] hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{campaign.external_name}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                      {campaign.organisations?.name ?? 'Leadership Quarter'}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                      {campaign.campaign_assessments.filter((assessment) => assessment.is_active).length}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[var(--admin-text-muted)]">{publicPath}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[campaign.status] ?? statusColors.draft}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CopyLinkButton slug={campaign.slug} organisationSlug={campaign.organisations?.slug} />
                    </td>
                    <td className="px-4 py-3">
                      <ActionMenu items={getActionItems(campaign)} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
