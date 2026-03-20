'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type OrgCampaign = {
  id: string
  external_name: string
  slug: string
  status: string
  created_at: string
  assessment_count: number
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    draft: 'bg-[rgba(103,127,159,0.1)] text-[var(--admin-text-muted)]',
    archived: 'bg-amber-50 text-amber-700',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colours[status] ?? colours.draft}`}>
      {status}
    </span>
  )
}

export function ClientCampaignsCard({ organisationId }: { organisationId: string }) {
  const [campaigns, setCampaigns] = useState<OrgCampaign[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetch(`/api/admin/organisations/${organisationId}/campaigns`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((body: { ok?: boolean; campaigns?: OrgCampaign[]; error?: string }) => {
        if (!mounted) return
        if (body.ok) {
          setCampaigns(body.campaigns ?? [])
        } else {
          setError('Failed to load campaigns.')
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load campaigns.')
      })
    return () => { mounted = false }
  }, [organisationId])

  return (
    <section className="rounded-2xl border border-[var(--dashboard-border,#e2e8f0)] bg-white p-6">
      <h2 className="text-base font-semibold text-[var(--dashboard-text-primary,#1a2a3d)]">
        Campaigns
      </h2>
      <p className="mt-1 text-sm text-[var(--dashboard-text-muted,#64748b)]">
        Campaigns attached to this client organisation.
      </p>

      <div className="mt-5">
        {campaigns === null && !error && (
          <p className="text-sm text-[var(--admin-text-muted)]">Loading...</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {campaigns !== null && campaigns.length === 0 && (
          <p className="text-sm text-[var(--admin-text-muted)]">
            No campaigns attached to this client yet.
          </p>
        )}
        {campaigns !== null && campaigns.length > 0 && (
          <ul className="divide-y divide-[var(--dashboard-border,#e2e8f0)]">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--dashboard-text-primary,#1a2a3d)]">
                    {campaign.external_name}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--dashboard-text-muted,#64748b)]">
                    /{campaign.slug} &middot; {campaign.assessment_count}{' '}
                    {campaign.assessment_count === 1 ? 'assessment' : 'assessments'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={campaign.status} />
                  <Link
                    href={`/dashboard/campaigns/${campaign.id}`}
                    className="text-xs font-medium text-[var(--admin-accent)] hover:underline"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
