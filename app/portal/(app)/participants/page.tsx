'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput, FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'
import { PortalHeader } from '@/components/portal/ui/portal-header'
import { PortalShell } from '@/components/portal/ui/portal-shell'

type CampaignFilter = { id: string; name: string }
type AssessmentFilter = { id: string; key: string; name: string }

type ParticipantRow = {
  submission_id: string
  campaign_id: string
  campaign_name: string
  assessment: { id: string; key: string; name: string } | null
  participant_name: string
  email: string
  classification_label: string
  summary_score: number | null
  completed_at: string | null
  created_at: string
}

type ParticipantsPayload = {
  ok: boolean
  participants?: ParticipantRow[]
  filters?: {
    campaigns: CampaignFilter[]
    assessments: AssessmentFilter[]
  }
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  message?: string
  error?: string
}

export default function PortalParticipantsPage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ParticipantsPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', '25')
    if (search) params.set('q', search)
    if (campaignId) params.set('campaign_id', campaignId)
    if (assessmentId) params.set('assessment_id', assessmentId)
    return params.toString()
  }, [search, campaignId, assessmentId, page])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/portal/participants?${query}`, { cache: 'no-store' })
        const body = (await res.json()) as ParticipantsPayload
        if (!mounted) return

        if (!res.ok || !body.ok || !body.filters || !body.pagination) {
          setLoadError(body.message ?? 'Could not load participants. Try again.')
          setData(null)
          setLoading(false)
          return
        }

        setLoadError(null)
        setData(body)
        setLoading(false)
      } catch {
        if (!mounted) return
        setLoadError('Could not load participants. Try again.')
        setData(null)
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [query])

  const filters = data?.filters ?? { campaigns: [], assessments: [] }
  const participants = data?.participants ?? []
  const pagination = data?.pagination ?? { page: 1, pageSize: 25, total: 0, totalPages: 1 }

  function runSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(q.trim())
    setPage(1)
  }

  return (
    <PortalShell>
      <PortalHeader
        title="Participants"
        description="Search participants and open their result summaries."
      />

      <form onSubmit={runSearch} className="grid gap-3 md:grid-cols-5">
        <FoundationInput
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search by name or email"
        />
        <FoundationSelect
          value={campaignId}
          onChange={(event) => {
            setCampaignId(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All campaigns</option>
          {filters.campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </FoundationSelect>
        <FoundationSelect
          value={assessmentId}
          onChange={(event) => {
            setAssessmentId(event.target.value)
            setPage(1)
          }}
        >
          <option value="">All assessments</option>
          {filters.assessments.map((assessment) => (
            <option key={assessment.id} value={assessment.id}>
              {assessment.name} ({assessment.key})
            </option>
          ))}
        </FoundationSelect>
        <FoundationButton type="submit" variant="primary">Search</FoundationButton>
      </form>

      <FoundationTableFrame className="overflow-x-auto border-[var(--portal-border)] bg-[var(--portal-surface)]">
        <table className="portal-table">
          <thead>
            <tr className="portal-table-head-row">
              <th className="px-4 py-3">Participant</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Campaign</th>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="portal-table-cell-muted px-4 py-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-red-600">
                  {loadError}
                </td>
              </tr>
            ) : participants.length === 0 ? (
              <tr>
                <td colSpan={8} className="portal-table-cell-muted px-4 py-6 text-center">
                  No participants found.
                </td>
              </tr>
            ) : (
              participants.map((row) => (
                <tr key={row.submission_id} className="portal-table-row">
                  <td className="px-4 py-3">{row.participant_name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.campaign_name}</td>
                  <td className="portal-table-cell-muted px-4 py-3">{row.assessment?.name ?? '—'}</td>
                  <td className="portal-table-cell-muted px-4 py-3">{row.classification_label}</td>
                  <td className="px-4 py-3">{row.summary_score ?? '—'}</td>
                  <td className="portal-table-cell-muted px-4 py-3">
                    {new Date(row.completed_at ?? row.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/portal/participants/${row.submission_id}`} className="portal-inline-link">
                      View result
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </FoundationTableFrame>

      <div className="flex items-center justify-between text-sm text-[var(--portal-text-muted)]">
        <p>
          {pagination.total === 0
            ? '0 results'
            : `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} results)`}
        </p>
        <div className="flex items-center gap-2">
          <FoundationButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </FoundationButton>
          <FoundationButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </FoundationButton>
        </div>
      </div>
    </PortalShell>
  )
}
