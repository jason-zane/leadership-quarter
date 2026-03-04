'use client'

import { useEffect, useState } from 'react'

type ResponseRow = {
  id: string
  created_at: string
  score: number | null
  assessment_invitations?: {
    email?: string
    first_name?: string
    last_name?: string
  } | null
}

export default function PortalCampaignResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaignId, setCampaignId] = useState('')
  const [responses, setResponses] = useState<ResponseRow[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const value = (await params).id
      if (mounted) setCampaignId(value)
    })()
    return () => {
      mounted = false
    }
  }, [params])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!campaignId || !mounted) return
      const res = await fetch(`/api/portal/campaigns/${campaignId}/responses`, { cache: 'no-store' })
      const body = (await res.json()) as { responses?: ResponseRow[] }
      setResponses(body.responses ?? [])
    })()
    return () => {
      mounted = false
    }
  }, [campaignId])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Responses</h1>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-3">{[row.assessment_invitations?.first_name, row.assessment_invitations?.last_name].filter(Boolean).join(' ') || '—'}</td>
                <td className="px-4 py-3">{row.assessment_invitations?.email ?? '—'}</td>
                <td className="px-4 py-3">{row.score ?? '—'}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(row.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
