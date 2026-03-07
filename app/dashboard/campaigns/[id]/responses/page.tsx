'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { FoundationButton } from '@/components/ui/foundation/button'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type Response = {
  id: string
  assessment_id: string
  status: string
  score: number | null
  created_at: string
  completed_at: string | null
  demographics: Record<string, string> | null
  assessments: { id: string; name: string; key: string } | null
  assessment_invitations: {
    first_name: string
    last_name: string
    email: string
    organisation: string | null
    role: string | null
  } | null
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function exportToCsv(responses: Response[]) {
  const headers = ['Name', 'Email', 'Organisation', 'Role', 'Assessment', 'Status', 'Score', 'Submitted', 'Completed']
  const rows = responses.map((r) => [
    r.assessment_invitations ? `${r.assessment_invitations.first_name} ${r.assessment_invitations.last_name}` : '',
    r.assessment_invitations?.email ?? '',
    r.assessment_invitations?.organisation ?? '',
    r.assessment_invitations?.role ?? '',
    r.assessments?.name ?? '',
    r.status,
    r.score?.toString() ?? '',
    formatDate(r.created_at),
    formatDate(r.completed_at),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'campaign-responses.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function CampaignResponsesPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((body: { responses?: Response[] }) => {
        setResponses(body.responses ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [campaignId])

  const completedCount = useMemo(
    () => responses.filter((response) => response.status === 'completed').length,
    [responses]
  )
  const scoredResponses = responses.filter((response) => typeof response.score === 'number')
  const averageScore = scoredResponses.length > 0
    ? (scoredResponses.reduce((sum, response) => sum + (response.score ?? 0), 0) / scoredResponses.length).toFixed(1)
    : '—'

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title="Responses"
        description="Review submissions by participant, assessment, and completion state."
        actions={responses.length > 0 ? (
          <FoundationButton type="button" variant="secondary" onClick={() => exportToCsv(responses)}>
            Export CSV
          </FoundationButton>
        ) : null}
      />

      <DashboardKpiStrip
        items={[
          { label: 'Total responses', value: responses.length },
          { label: 'Completed', value: completedCount },
          { label: 'Average score', value: averageScore },
        ]}
      />

      <DashboardDataTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Assessment</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">Loading responses...</td></tr>
            ) : responses.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">No responses yet.</td></tr>
            ) : (
              responses.map((response) => (
                <tr key={response.id} className="border-t border-[rgba(103,127,159,0.12)]">
                  <td className="px-4 py-3 font-medium text-[var(--admin-text-primary)]">
                    {response.assessment_invitations
                      ? `${response.assessment_invitations.first_name} ${response.assessment_invitations.last_name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">{response.assessment_invitations?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">{response.assessments?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-[var(--admin-text-muted)]">{response.status}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">{response.score ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">{formatDate(response.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
