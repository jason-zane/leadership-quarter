'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PortalHeader } from '@/components/portal/ui/portal-header'
import { PortalShell } from '@/components/portal/ui/portal-shell'
import { PortalStatusPanel } from '@/components/portal/ui/status-panel'

type ResultPayload = {
  ok: boolean
  result?: {
    id: string
    campaign: { id: string; name: string; slug: string }
    assessment: { id: string; key: string; name: string } | null
    participant: {
      first_name: string | null
      last_name: string | null
      email: string | null
      organisation: string | null
      role: string | null
    }
    status: string | null
    completed_at: string | null
    created_at: string
    scores: Record<string, number>
    bands: Record<string, string>
    classification: { key: string | null; label: string | null }
    recommendations: unknown[]
  }
}

export default function PortalParticipantDetailPage({
  params,
}: {
  params: Promise<{ submissionId: string }>
}) {
  const [submissionId, setSubmissionId] = useState('')
  const [data, setData] = useState<ResultPayload | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const value = (await params).submissionId
      if (mounted) setSubmissionId(value)
    })()
    return () => {
      mounted = false
    }
  }, [params])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!submissionId || !mounted) return
      const res = await fetch(`/api/portal/participants/${submissionId}`, { cache: 'no-store' })
      const body = (await res.json()) as ResultPayload
      if (mounted) setData(body)
    })()
    return () => {
      mounted = false
    }
  }, [submissionId])

  if (!data) {
    return (
      <PortalShell>
        <p className="text-sm text-[var(--portal-text-muted)]">Loading...</p>
      </PortalShell>
    )
  }

  if (!data.ok || !data.result) {
    return (
      <PortalShell>
        <p className="text-sm text-[var(--portal-text-muted)]">Participant result not found.</p>
      </PortalShell>
    )
  }

  const result = data.result
  const participantName =
    [result.participant.first_name, result.participant.last_name].filter(Boolean).join(' ') || 'Participant'

  return (
    <PortalShell>
      <PortalHeader
        title={participantName}
        description={`${result.campaign.name}${result.assessment ? ` • ${result.assessment.name}` : ''}`}
        actions={(
          <div className="flex gap-3">
            <Link href="/portal/participants" className="portal-inline-link">Back to participants</Link>
            <Link href={`/portal/campaigns/${result.campaign.id}/responses`} className="portal-inline-link">
              Campaign responses
            </Link>
          </div>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStatusPanel title="Profile">
          <p><strong>{result.classification.label ?? 'Unknown'}</strong></p>
          <p className="text-xs">Status: {result.status ?? '—'}</p>
        </PortalStatusPanel>
        <PortalStatusPanel title="Participant">
          <p>{result.participant.email ?? '—'}</p>
          <p className="text-xs">{result.participant.organisation ?? '—'} {result.participant.role ? `• ${result.participant.role}` : ''}</p>
        </PortalStatusPanel>
        <PortalStatusPanel title="Submitted">
          <p>{new Date(result.completed_at ?? result.created_at).toLocaleString()}</p>
          <p className="text-xs">Campaign: {result.campaign.slug}</p>
        </PortalStatusPanel>
      </div>

      <PortalStatusPanel title="Key scores">
        {Object.keys(result.scores).length === 0 ? (
          <p>No score data available.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(result.scores).map(([key, value]) => (
              <div key={key} className="rounded border border-[var(--portal-border)] bg-[var(--portal-surface-alt)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--portal-text-muted)]">{key}</p>
                <p className="text-xl font-semibold text-[var(--portal-text-primary)]">{value}</p>
                <p className="text-xs text-[var(--portal-text-muted)]">{result.bands[key] ?? '—'}</p>
              </div>
            ))}
          </div>
        )}
      </PortalStatusPanel>

      <PortalStatusPanel title="Recommendations">
        {result.recommendations.length === 0 ? (
          <p>No recommendations available.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            {result.recommendations.map((item, idx) => (
              <li key={`${idx}-${String(item)}`}>{String(item)}</li>
            ))}
          </ul>
        )}
      </PortalStatusPanel>
    </PortalShell>
  )
}
