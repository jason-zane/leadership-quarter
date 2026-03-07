'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput, FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalHeader } from '@/components/portal/ui/portal-header'
import { PortalMetricCard } from '@/components/portal/ui/metric-card'
import { PortalStatusPanel } from '@/components/portal/ui/status-panel'

type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'

type Campaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  created_at: string
}

type AssessmentItem = {
  assessment_id: string
  assessment: { id: string; key: string; name: string }
}

const allowedStatusTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['active', 'archived'],
  active: ['closed', 'archived'],
  closed: ['archived'],
  archived: [],
}

function statusTone(status: CampaignStatus) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-800'
  if (status === 'draft') return 'bg-amber-100 text-amber-800'
  if (status === 'closed') return 'bg-blue-100 text-blue-800'
  return 'bg-zinc-200 text-zinc-700'
}

export default function PortalCampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [assessments, setAssessments] = useState<AssessmentItem[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const campaignQuery = new URLSearchParams({
      page: '1',
      pageSize: '100',
      includeArchived: includeArchived ? 'true' : 'false',
    })
    const [campaignRes, assessmentRes] = await Promise.all([
      fetch(`/api/portal/campaigns?${campaignQuery.toString()}`, { cache: 'no-store' }),
      fetch('/api/portal/assessments', { cache: 'no-store' }),
    ])

    const campaignBody = (await campaignRes.json()) as { campaigns?: Campaign[] }
    const assessmentBody = (await assessmentRes.json()) as { assessments?: AssessmentItem[] }

    setCampaigns(campaignBody.campaigns ?? [])
    setAssessments(assessmentBody.assessments ?? [])
    setLoading(false)
  }, [includeArchived])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!mounted) return
      await load()
    })()
    return () => {
      mounted = false
    }
  }, [load])

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    if (!assessmentId) {
      setError('Select an assessment.')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: slug || undefined, assessment_ids: [assessmentId] }),
      })
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string }
      if (!res.ok || !body.ok) {
        setError(body.message ?? body.error ?? 'Failed to create campaign.')
        return
      }

      setName('')
      setSlug('')
      setAssessmentId('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function transitionCampaign(campaign: Campaign, nextStatus: CampaignStatus) {
    setUpdatingId(campaign.id)
    setError(null)
    try {
      const res = await fetch(`/api/portal/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string }
      if (!res.ok || !body.ok) {
        setError(body.message ?? body.error ?? 'Failed to update campaign.')
        return
      }
      await load()
    } finally {
      setUpdatingId(null)
    }
  }

  const draftCount = campaigns.filter((campaign) => campaign.status === 'draft').length
  const activeCount = campaigns.filter((campaign) => campaign.status === 'active').length

  return (
    <PortalShell>
      <PortalHeader
        eyebrow="Portal"
        title="Campaigns"
        description="Create campaigns, open workspaces, and manage lifecycle without crowding the day-to-day view."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalMetricCard label="In view" value={campaigns.length} />
        <PortalMetricCard label="Active" value={activeCount} />
        <PortalMetricCard label="Draft" value={draftCount} />
      </div>

      <PortalStatusPanel title="New campaign">
        <form onSubmit={createCampaign} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <FoundationInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name"
              required
            />
            <FoundationInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug-optional"
            />
            <FoundationSelect
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
              required
            >
              <option value="">Select assessment</option>
              {assessments.map((row) => (
                <option key={row.assessment_id} value={row.assessment_id}>
                  {row.assessment.name} ({row.assessment.key})
                </option>
              ))}
            </FoundationSelect>
            <FoundationButton type="submit" disabled={creating} variant="primary">
              {creating ? 'Creating...' : 'Create'}
            </FoundationButton>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-[var(--portal-text-muted)]">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              Include archived campaigns in the table
            </label>
            <p className="text-xs text-[var(--portal-text-muted)]">
              Pick one assessment, name the campaign clearly, and leave the slug blank unless you need a custom URL.
            </p>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </PortalStatusPanel>

      <FoundationTableFrame className="overflow-x-auto border-[var(--portal-border)] bg-[var(--portal-surface)]">
        <table className="portal-table">
          <thead>
            <tr className="portal-table-head-row">
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="portal-table-cell-muted px-4 py-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="portal-table-cell-muted px-4 py-6 text-center">
                  No campaigns yet.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => {
                const transitions = allowedStatusTransitions[campaign.status]
                const busy = updatingId === campaign.id
                return (
                  <tr key={campaign.id} className="portal-table-row">
                    <td className="px-4 py-3 font-medium text-[var(--portal-text-primary)]">
                      <div className="flex flex-col gap-1">
                        <Link href={`/portal/campaigns/${campaign.id}`} className="portal-inline-link text-sm">
                          {campaign.name}
                        </Link>
                        <span className="text-xs text-[var(--portal-text-muted)]">/{campaign.slug}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusTone(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="portal-table-cell-muted px-4 py-3">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu
                        items={[
                          {
                            type: 'item',
                            label: 'Open workspace',
                            onSelect: () => router.push(`/portal/campaigns/${campaign.id}`),
                          },
                          ...(transitions.includes('active')
                            ? [{ type: 'item', label: 'Turn on (Active)', onSelect: () => void transitionCampaign(campaign, 'active'), disabled: busy } as ActionItem]
                            : []),
                          ...(transitions.includes('closed')
                            ? [{ type: 'item', label: 'Turn off (Close)', onSelect: () => void transitionCampaign(campaign, 'closed'), disabled: busy } as ActionItem]
                            : []),
                          ...(transitions.includes('archived')
                            ? [{ type: 'item', label: 'Archive', onSelect: () => void transitionCampaign(campaign, 'archived'), destructive: true, disabled: busy } as ActionItem]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </FoundationTableFrame>
    </PortalShell>
  )
}
