'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'

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
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    await navigator.clipboard.writeText(`${origin}/c/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/campaigns', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body: { campaigns?: Campaign[] }) => {
        setCampaigns(body.campaigns ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Campaigns</h1>
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
              <th className="px-4 py-3 font-medium">Assessments</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">No campaigns yet.</td></tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {campaign.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{campaign.organisations?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {campaign.campaign_assessments.filter((a) => a.is_active).length}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-zinc-500">/c/{campaign.slug}</span>
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
      </div>
    </div>
  )
}
