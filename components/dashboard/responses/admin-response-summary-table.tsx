'use client'

import { useRouter } from 'next/navigation'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

export type AdminResponseSummaryRow = {
  id: string
  participantName: string
  email: string
  contextLine: string
  assessmentName?: string | null
  averageTraitScore: number | null
  outcomeLabel: string | null
  submittedAt: string
  detailHref: string
  reportsHref: string
  currentReportHref: string | null
  candidateHref?: string | null
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatMetric(value: number | null) {
  return value === null ? '—' : value.toFixed(1)
}

export function AdminResponseSummaryTable({
  rows,
  includeAssessmentColumn = false,
  emptyMessage,
}: {
  rows: AdminResponseSummaryRow[]
  includeAssessmentColumn?: boolean
  emptyMessage: string
}) {
  const router = useRouter()

  return (
    <DashboardDataTableShell>
      {rows.length === 0 ? (
        <div className="px-6 py-10 text-sm text-[var(--admin-text-muted)]">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th className="px-4 py-3">Participant</th>
                {includeAssessmentColumn ? <th className="px-4 py-3">Assessment</th> : null}
                <th className="px-4 py-3">Avg trait score</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const items: ActionItem[] = [
                  {
                    type: 'item',
                    label: 'Open response',
                    onSelect: () => router.push(row.detailHref),
                  },
                  {
                    type: 'item',
                    label: 'Open reports',
                    onSelect: () => router.push(row.reportsHref),
                  },
                ]

                if (row.currentReportHref) {
                  items.push({
                    type: 'item',
                    label: 'View current report',
                    onSelect: () => window.open(row.currentReportHref ?? '', '_blank', 'noopener,noreferrer'),
                  })
                }

                if (row.candidateHref) {
                  items.push({ type: 'separator' })
                  items.push({
                    type: 'item',
                    label: 'Open candidate journey',
                    onSelect: () => router.push(row.candidateHref ?? ''),
                  })
                }

                return (
                  <tr key={row.id}>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => router.push(row.detailHref)}
                        className="text-left"
                      >
                        <span className="block font-semibold text-[var(--admin-text-primary)] hover:underline">
                          {row.participantName}
                        </span>
                      </button>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                        {[row.email, row.contextLine].filter(Boolean).join(' · ')}
                      </p>
                    </td>
                    {includeAssessmentColumn ? (
                      <td className="px-4 py-4 text-[var(--admin-text-muted)]">
                        {row.assessmentName || 'Assessment'}
                      </td>
                    ) : null}
                    <td className="px-4 py-4 text-[var(--admin-text-primary)]">
                      {formatMetric(row.averageTraitScore)}
                    </td>
                    <td className="px-4 py-4 text-[var(--admin-text-muted)]">
                      {row.outcomeLabel || '—'}
                    </td>
                    <td className="px-4 py-4 text-[var(--admin-text-muted)]">
                      {formatDate(row.submittedAt)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <ActionMenu items={items} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardDataTableShell>
  )
}
