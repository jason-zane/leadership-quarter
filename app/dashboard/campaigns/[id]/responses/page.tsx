'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { AdminResponseSummaryRow } from '@/components/dashboard/responses/admin-response-summary-table'
import { AdminResponseSummaryTable } from '@/components/dashboard/responses/admin-response-summary-table'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { DashboardFilterBar } from '@/components/dashboard/ui/filter-bar'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'

type CandidateRow = {
  candidateKey: string
  participantName: string
  email: string
  organisation: string | null
  role: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  completedAssessments: number
  totalAssessments: number
  lastActivityAt: string | null
  submissionCount: number
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default function CampaignResponsesPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const [view, setView] = useState<'candidates' | 'submissions'>('candidates')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [submissions, setSubmissions] = useState<AdminResponseSummaryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    const query = new URLSearchParams({
      view,
    })
    if (deferredSearch.trim()) {
      query.set('q', deferredSearch.trim())
    }

    fetch(`/api/admin/campaigns/${campaignId}/responses?${query.toString()}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: { candidates?: CandidateRow[]; submissions?: AdminResponseSummaryRow[] }) => {
        if (!active) return
        setCandidates(body.candidates ?? [])
        setSubmissions(body.submissions ?? [])
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setCandidates([])
        setSubmissions([])
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [campaignId, deferredSearch, view])

  const candidateCompletionRate = useMemo(() => {
    if (candidates.length === 0) return '—'
    const completed = candidates.filter((candidate) => candidate.status === 'completed').length
    return `${Math.round((completed / candidates.length) * 100)}%`
  }, [candidates])

  const visibleAverageTraitScore = useMemo(() => {
    const values = submissions
      .map((submission) => submission.averageTraitScore)
      .filter((value): value is number => value !== null)

    if (values.length === 0) return '—'

    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  }, [submissions])

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title="Responses"
        description="Search participants, switch between candidate journeys and individual submissions, and click through into campaign-specific detail."
      />

      <DashboardKpiStrip
        items={[
          { label: 'Candidates', value: candidates.length },
          { label: 'Submissions', value: submissions.length },
          { label: 'Completion rate', value: candidateCompletionRate },
          { label: 'Visible trait avg', value: visibleAverageTraitScore },
        ]}
      />

      <DashboardFilterBar>
        <div className="space-y-3">
          <p className="admin-filter-copy">
            Search names, emails, organisations, roles, or assessments, then move between candidate journeys and individual submissions.
          </p>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search names, emails, organisations, roles, or assessments"
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2 text-sm text-[var(--admin-text-primary)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[rgba(82,110,255,0.16)] md:w-[30rem]"
          />
        </div>
        <div className="admin-toggle-group" role="tablist" aria-label="Campaign response views">
          <button
            type="button"
            onClick={() => setView('candidates')}
            className={view === 'candidates' ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
          >
            Candidates
          </button>
          <button
            type="button"
            onClick={() => setView('submissions')}
            className={view === 'submissions' ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
          >
            Submissions
          </button>
        </div>
      </DashboardFilterBar>

      {view === 'candidates' ? (
        <DashboardDataTableShell>
          <table className="admin-data-table">
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Progress</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Latest activity</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="admin-data-table-empty"><td colSpan={5}>Loading candidates…</td></tr>
              ) : candidates.length === 0 ? (
                <tr className="admin-data-table-empty"><td colSpan={5}>No candidate journeys found.</td></tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate.candidateKey}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/campaigns/${campaignId}/responses/candidates/${encodeURIComponent(candidate.candidateKey)}`}
                        className="font-medium text-[var(--admin-text-primary)] hover:underline"
                      >
                        {candidate.participantName}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{candidate.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                      {[candidate.organisation, candidate.role].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                      {candidate.completedAssessments}/{candidate.totalAssessments} assessments
                    </td>
                    <td className="px-4 py-3 capitalize text-[var(--admin-text-muted)]">{candidate.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">{formatDate(candidate.lastActivityAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DashboardDataTableShell>
      ) : loading ? (
        <DashboardDataTableShell>
          <div className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">Loading submissions…</div>
        </DashboardDataTableShell>
      ) : (
        <AdminResponseSummaryTable
          rows={submissions}
          includeAssessmentColumn
          emptyMessage="No submissions found."
        />
      )}
    </DashboardPageShell>
  )
}
