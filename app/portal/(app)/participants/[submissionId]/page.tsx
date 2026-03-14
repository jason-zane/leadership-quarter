'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SubmissionReportSelector } from '@/components/reports/submission-report-selector'
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
    reportOptions: Array<{
      key: string
      label: string
      description: string
      currentDefault: boolean
      accessToken: string | null
      reportType?: 'assessment' | 'assessment_v2'
      viewHref?: string | null
      canExport?: boolean
      canEmail?: boolean
    }>
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
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
        <p className="text-sm text-[var(--portal-text-muted)]">Participant response not found.</p>
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
        <PortalStatusPanel title="Participant">
          <p>{result.participant.email ?? '—'}</p>
          <p className="text-xs text-[var(--portal-text-muted)]">
            {[result.participant.organisation, result.participant.role].filter(Boolean).join(' · ') || 'No organisation or role'}
          </p>
        </PortalStatusPanel>
        <PortalStatusPanel title="Assessment">
          <p>{result.assessment?.name ?? 'Assessment'}</p>
          <p className="text-xs text-[var(--portal-text-muted)]">Campaign: {result.campaign.name}</p>
        </PortalStatusPanel>
        <PortalStatusPanel title="Submission">
          <p>{formatTimestamp(result.completed_at ?? result.created_at)}</p>
          <p className="text-xs text-[var(--portal-text-muted)]">
            Status: {result.status?.replace(/_/g, ' ') ?? '—'}
          </p>
        </PortalStatusPanel>
      </div>

      <PortalStatusPanel title="Reports">
        {result.reportOptions.length === 0 ? (
          <p>No report views are currently available for this response.</p>
        ) : (
          <SubmissionReportSelector
            options={result.reportOptions}
            canEmail={Boolean(result.participant.email)}
            linkClassName="portal-inline-link"
            exportClassName="portal-inline-link"
            emailClassName="portal-inline-link bg-transparent p-0"
            statusClassName="text-xs text-[var(--portal-text-muted)]"
          />
        )}
      </PortalStatusPanel>
    </PortalShell>
  )
}
