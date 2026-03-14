'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalHeader } from '@/components/portal/ui/portal-header'

type ResponseRow = {
  id: string
  created_at: string
  completed_at: string | null
  assessment_name: string | null
  participant_name: string
  email: string | null
  context_line: string | null
  status: string
}

export default function PortalCampaignResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaignId, setCampaignId] = useState('')
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)

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
      setLoading(true)
      const res = await fetch(`/api/portal/campaigns/${campaignId}/responses`, { cache: 'no-store' })
      const body = (await res.json()) as { responses?: ResponseRow[] }
      setResponses(body.responses ?? [])
      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [campaignId])

  return (
    <PortalShell>
      <PortalHeader title="Responses" description="Review submitted participant responses." />
      <FoundationTableFrame className="overflow-x-auto border-[var(--portal-border)] bg-[var(--portal-surface)]">
        <table className="portal-table">
          <thead>
            <tr className="portal-table-head-row">
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="portal-table-cell-muted px-4 py-6 text-center">Loading...</td>
              </tr>
            ) : responses.length === 0 ? (
              <tr>
                <td colSpan={5} className="portal-table-cell-muted px-4 py-6 text-center">No responses yet.</td>
              </tr>
            ) : responses.map((row) => (
              <tr key={row.id} className="portal-table-row">
                <td className="px-4 py-3">
                  <p>{row.participant_name}</p>
                  <p className="portal-table-cell-muted text-xs">{[row.email, row.context_line].filter(Boolean).join(' · ') || '—'}</p>
                </td>
                <td className="px-4 py-3">{row.assessment_name ?? 'Assessment'}</td>
                <td className="portal-table-cell-muted px-4 py-3">{row.status.replace(/_/g, ' ')}</td>
                <td className="portal-table-cell-muted px-4 py-3">{new Date(row.completed_at ?? row.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <Link href={`/portal/participants/${row.id}`} className="portal-inline-link">
                    Open response
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </FoundationTableFrame>
    </PortalShell>
  )
}
