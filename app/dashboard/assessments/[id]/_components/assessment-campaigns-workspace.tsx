'use client'

import Link from 'next/link'
import { useDeferredValue, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon } from '@/components/icons'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { DashboardFilterBar } from '@/components/dashboard/ui/filter-bar'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { FoundationSurface } from '@/components/ui/foundation/surface'

type CampaignScope = 'all' | 'lq' | 'client'

type AssessmentCampaignRow = {
  id: string
  campaignAssessmentId: string
  name: string
  external_name: string
  slug: string
  status: string
  organisation_id: string | null
  owner_scope: 'lq' | 'client'
  owner_label: string
  organisations: { id: string; name: string; slug: string } | null
  is_active: boolean
  flow_position_label: string
  flow_detail: string
  response_count: number
  can_shadow_preview: boolean
  shadow_preview_url: string
}

type CampaignListResponse = {
  ok?: boolean
  campaigns?: AssessmentCampaignRow[]
  error?: string
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

function matchesSearch(row: AssessmentCampaignRow, search: string) {
  if (!search) return true

  const haystack = [
    row.name,
    row.external_name,
    row.slug,
    row.owner_label,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}

function getScopeLabel(scope: CampaignScope) {
  if (scope === 'lq') return 'Leadership Quarter campaigns'
  if (scope === 'client') return 'Client campaigns'
  return 'All linked campaigns'
}

function ShadowStatus({ canShadowPreview }: { canShadowPreview: boolean }) {
  if (!canShadowPreview) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--admin-text-primary)]">Blocked</p>
        <p className="text-xs text-[var(--admin-text-muted)]">Enable the assessment route and finish the core setup before launching this flow.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
        <CheckIcon className="h-3.5 w-3.5" />
        Launch ready
      </div>
      <p className="text-xs text-[var(--admin-text-muted)]">Uses the campaign route so you can review the candidate flow directly.</p>
    </div>
  )
}

export function AssessmentCampaignsWorkspace({ assessmentId }: { assessmentId: string }) {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<AssessmentCampaignRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<CampaignScope>('all')
  const [showArchived, setShowArchived] = useState(false)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let active = true

    async function loadCampaigns() {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/assessments/${assessmentId}/campaigns`, {
        cache: 'no-store',
      }).catch(() => null)
      const body = (await response?.json().catch(() => null)) as CampaignListResponse | null

      if (!active) return

      if (!response?.ok || !body?.ok) {
        setCampaigns([])
        setError('Failed to load linked campaigns.')
        setLoading(false)
        return
      }

      setCampaigns(body.campaigns ?? [])
      setLoading(false)
    }

    void loadCampaigns()

    return () => {
      active = false
    }
  }, [assessmentId])

  const filteredCampaigns = campaigns
    .filter((campaign) => scope === 'all' || campaign.owner_scope === scope)
    .filter((campaign) => showArchived || campaign.status !== 'archived')
    .filter((campaign) => matchesSearch(campaign, deferredSearch.trim().toLowerCase()))

  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length
  const archivedCampaigns = campaigns.filter((campaign) => campaign.status === 'archived').length
  const clientCampaigns = campaigns.filter((campaign) => campaign.owner_scope === 'client').length

  async function mutateCampaign(
    campaign: AssessmentCampaignRow,
    mutation: { type: 'archive' | 'delete' | 'detach' }
  ) {
    setMutatingId(campaign.id)
    setError(null)

    const response = await fetch(`/api/admin/assessments/${assessmentId}/campaigns/${campaign.id}`, {
      method: mutation.type === 'archive' ? 'PATCH' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:
        mutation.type === 'archive'
          ? JSON.stringify({ status: 'archived' })
          : JSON.stringify(
              mutation.type === 'detach'
                ? { mode: 'detach', campaignAssessmentId: campaign.campaignAssessmentId }
                : { mode: 'campaign' }
            ),
    }).catch(() => null)

    const body = (await response?.json().catch(() => null)) as MutationResponse | null

    if (!response?.ok || !body?.ok) {
      if (body?.error === 'campaign_has_activity') {
        setError('Campaigns with invitations or submissions cannot be deleted. Archive or detach the assessment instead.')
      } else if (mutation.type === 'detach') {
        setError('Failed to remove this assessment from the campaign.')
      } else if (mutation.type === 'archive') {
        setError('Failed to archive the campaign.')
      } else {
        setError('Failed to delete the campaign.')
      }
      setMutatingId(null)
      return
    }

    setCampaigns((current) =>
      mutation.type === 'archive'
        ? current.map((item) => (item.id === campaign.id ? { ...item, status: 'archived' } : item))
        : current.filter((item) => item.id !== campaign.id)
    )
    setMutatingId(null)
  }

  function getActionItems(campaign: AssessmentCampaignRow): ActionItem[] {
    const busy = mutatingId === campaign.id

    return [
      {
        type: 'item',
        label: 'Open campaign',
        onSelect: () => router.push(`/dashboard/campaigns/${campaign.id}`),
      },
      {
        type: 'item',
        label: 'Open campaign',
        disabled: !campaign.can_shadow_preview,
        onSelect: () => {
          window.open(campaign.shadow_preview_url, '_blank', 'noopener,noreferrer')
        },
      },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Remove assessment',
        disabled: busy,
        onSelect: () => {
          if (!window.confirm(`Remove this assessment from "${campaign.name}"?`)) return
          void mutateCampaign(campaign, { type: 'detach' })
        },
      },
      {
        type: 'item',
        label: 'Archive campaign',
        disabled: busy || campaign.status === 'archived',
        onSelect: () => {
          if (!window.confirm(`Archive "${campaign.name}"?`)) return
          void mutateCampaign(campaign, { type: 'archive' })
        },
      },
      { type: 'separator' },
      {
        type: 'item',
        label: 'Delete campaign',
        destructive: true,
        disabled: busy,
        onSelect: () => {
          if (!window.confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return
          void mutateCampaign(campaign, { type: 'delete' })
        },
      },
    ]
  }

  return (
    <div className="space-y-6">
      <DashboardKpiStrip
        items={[
          { label: 'In view', value: filteredCampaigns.length },
          { label: 'Active', value: activeCampaigns },
          { label: 'Client-owned', value: clientCampaigns },
          { label: 'Archived', value: archivedCampaigns },
        ]}
      />

      <DashboardFilterBar>
        <div className="space-y-3">
          <p className="admin-filter-copy">
            {getScopeLabel(scope)}. Use this list to open campaign delivery, manage attachment, and review launch readiness.
          </p>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns, public names, slugs, or clients"
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2 text-sm text-[var(--admin-text-primary)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[rgba(82,110,255,0.16)] md:w-[28rem]"
          />
        </div>

        <div className="space-y-3">
          <div className="admin-toggle-group" role="tablist" aria-label="Campaign ownership">
            {([
              ['all', 'All'],
              ['lq', 'Leadership Quarter'],
              ['client', 'Client'],
            ] as const).map(([value, label]) => {
              const isActive = scope === value

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScope(value)}
                  className={isActive ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
                >
                  {label}
                </button>
              )
            })}
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

      <FoundationSurface className="rounded-[1.5rem] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Linked campaigns</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Manage attachment and lifecycle actions here, then open the campaign workspace for deeper flow editing.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
            <p className="font-medium text-[var(--admin-text-primary)]">Campaign launch</p>
            <p className="mt-1 max-w-[28rem]">
              Open the campaign flow directly from here once the assessment route and core setup are ready.
            </p>
          </div>
        </div>
      </FoundationSurface>

      {error ? (
        <FoundationSurface className="rounded-[1.5rem] border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
          {error}
        </FoundationSurface>
      ) : null}

      <DashboardDataTableShell>
        {loading ? (
          <div className="px-6 py-10 text-sm text-[var(--admin-text-muted)]">Loading linked campaigns...</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--admin-text-muted)]">
            {campaigns.length === 0
              ? 'No campaigns are linked to this assessment yet.'
              : 'No campaigns match the current filters.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Flow</th>
                  <th className="px-4 py-3">Responses</th>
                  <th className="px-4 py-3">Launch</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.campaignAssessmentId} className="align-top">
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="font-semibold text-[var(--admin-text-primary)] hover:underline"
                      >
                        {campaign.name}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{campaign.external_name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <span className="inline-flex rounded-full bg-[var(--admin-surface-alt)] px-3 py-1 text-xs font-medium text-[var(--admin-text-primary)]">
                          {campaign.owner_scope === 'client' ? 'Client' : 'Leadership Quarter'}
                        </span>
                        <p className="text-xs text-[var(--admin-text-muted)]">{campaign.owner_label}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColors[campaign.status] ?? statusColors.draft}`}>
                          {campaign.status}
                        </span>
                        <span className={[
                          'inline-flex rounded-full px-3 py-1 text-xs font-medium',
                          campaign.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600',
                        ].join(' ')}>
                          {campaign.is_active ? 'Assessment active' : 'Assessment inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-[var(--admin-text-primary)]">{campaign.flow_position_label}</p>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{campaign.flow_detail}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-[var(--admin-text-primary)]">{campaign.response_count}</p>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">Submissions in this campaign</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-3">
                        <ShadowStatus canShadowPreview={campaign.can_shadow_preview} />
                        {campaign.can_shadow_preview ? (
                          <a
                            href={campaign.shadow_preview_url}
                            className="foundation-btn foundation-btn-secondary foundation-btn-sm inline-flex"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open campaign
                          </a>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <ActionMenu items={getActionItems(campaign)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardDataTableShell>
    </div>
  )
}
