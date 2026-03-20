'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { PortalCampaignWorkspaceHeader } from '@/components/portal/campaign-workspace-header'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'
import { PortalShell } from '@/components/portal/ui/portal-shell'

type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'
type Campaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
}

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
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

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

  const load = useCallback(async () => {
    if (!campaignId) return
    setLoading(true)
    const [campaignRes, responsesRes] = await Promise.all([
      fetch(`/api/portal/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/portal/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as { campaign?: Campaign }
    const body = (await responsesRes.json()) as { responses?: ResponseRow[] }
    setCampaign(campaignBody.campaign ?? null)
    setResponses(body.responses ?? [])
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!campaignId || !mounted) return
      await load()
    })()
    return () => {
      mounted = false
    }
  }, [campaignId, load])

  async function updateStatus(nextStatus: CampaignStatus) {
    if (!campaignId) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/portal/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const body = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok || !body.ok) {
        return
      }
      await load()
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <PortalShell>
      {campaign ? (
        <PortalCampaignWorkspaceHeader
          campaign={campaign}
          activeTab="responses"
          description="Campaign-scoped response review. Use Participants for the organisation-wide view."
          updatingStatus={updatingStatus}
          onStatusChange={(status) => {
            void updateStatus(status)
          }}
        />
      ) : null}
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
