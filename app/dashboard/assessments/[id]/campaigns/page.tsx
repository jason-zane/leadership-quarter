'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPublicCampaignPath } from '@/utils/campaign-url'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'

type Campaign = {
  id: string
  name: string
  slug: string
  status: string
  config: CampaignConfig
  created_at: string
  organisations: { id: string; name: string; slug: string } | null
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function SurveyCampaignsPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      const res = await fetch(`/api/admin/assessments/${surveyId}/campaigns`, { cache: 'no-store' })
      const body = (await res.json()) as { campaigns?: Campaign[] }
      if (!active) return
      setCampaigns(body.campaigns ?? [])
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [surveyId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} include this survey
        </p>
        <Link
          href="/dashboard/campaigns/new"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          + New campaign
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Organisation</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">View</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">This survey is not included in any campaigns yet.</td></tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{campaign.organisations?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-zinc-500">{getPublicCampaignPath(campaign.slug, campaign.organisations?.slug)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[campaign.status] ?? statusColors.draft}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      View campaign
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
