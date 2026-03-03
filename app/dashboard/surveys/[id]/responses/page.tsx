'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Submission = {
  id: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  scores: Record<string, number>
  bands: Record<string, string>
  classification: { key?: string; label?: string } | null
  created_at: string
}

const classificationColors: Record<string, string> = {
  ai_ready_operator: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  naive_enthusiast: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cautious_traditionalist: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  eager_but_underdeveloped: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  ai_resistant: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  developing_operator: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

function ScorePill({ label, value }: { label: string; value: number | undefined }) {
  if (value === undefined) return <span className="text-zinc-400">—</span>
  return (
    <span className="font-mono text-xs">
      <span className="text-zinc-400">{label[0]}</span>{value.toFixed(1)}
    </span>
  )
}

function exportCsv(rows: Submission[]) {
  const header = ['Name', 'Organisation', 'Classification', 'Openness', 'Risk Posture', 'Capability', 'Date']
  const lines = rows.map((r) => [
    [r.first_name, r.last_name].filter(Boolean).join(' ') || '',
    r.organisation ?? '',
    r.classification?.label ?? '',
    r.scores?.openness?.toFixed(2) ?? '',
    r.scores?.riskPosture?.toFixed(2) ?? '',
    r.scores?.capability?.toFixed(2) ?? '',
    new Date(r.created_at).toLocaleDateString('en-AU'),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'responses.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function SurveyResponsesPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id
  const [rows, setRows] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/surveys/${surveyId}/responses`, { cache: 'no-store' })
      const body = (await res.json()) as { responses?: Submission[] }
      setRows(body.responses ?? [])
      setLoading(false)
    }
    void load()
  }, [surveyId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{rows.length} response{rows.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => exportCsv(rows)}
          disabled={rows.length === 0}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Classification</th>
              <th className="px-4 py-3 font-medium">Respondent</th>
              <th className="px-4 py-3 font-medium">Organisation</th>
              <th className="px-4 py-3 font-medium">Scores (O / R / C)</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">No responses yet.</td></tr>
            ) : (
              rows.map((row) => {
                const key = row.classification?.key ?? ''
                const label = row.classification?.label ?? 'Unknown'
                const colorClass = classificationColors[key] ?? classificationColors.developing_operator
                const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '—'
                return (
                  <tr key={row.id} className="border-t border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/surveys/${surveyId}/responses/${row.id}`}>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
                          {label}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">{name}</td>
                    <td className="px-4 py-3 text-zinc-500">{row.organisation ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ScorePill label="O" value={row.scores?.openness} />
                        <span className="text-zinc-300">/</span>
                        <ScorePill label="R" value={row.scores?.riskPosture} />
                        <span className="text-zinc-300">/</span>
                        <ScorePill label="C" value={row.scores?.capability} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(new Date(row.created_at))}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
