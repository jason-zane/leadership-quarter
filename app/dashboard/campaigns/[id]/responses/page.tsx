'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{responses.length} response{responses.length !== 1 ? 's' : ''}</p>
        {responses.length > 0 && (
          <button
            onClick={() => exportToCsv(responses)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
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
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : responses.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-400">No responses yet.</td></tr>
            ) : (
              responses.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {r.assessment_invitations
                      ? `${r.assessment_invitations.first_name} ${r.assessment_invitations.last_name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{r.assessment_invitations?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500">{r.assessments?.name ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-zinc-500">{r.status}</td>
                  <td className="px-4 py-3 text-zinc-500">{r.score ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
