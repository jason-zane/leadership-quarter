'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionMenu, type ActionItem } from '@/components/ui/action-menu'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { DashboardFilterBar } from '@/components/dashboard/ui/filter-bar'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { FoundationSurface } from '@/components/ui/foundation/surface'

export type V2ResponseSummaryRow = {
  id: string
  participantName: string
  email: string
  contextLine: string
  averageTraitScore: number | null
  answeredItems: number
  totalItems: number
  completionPercent: number
  submittedAt: string
  detailHref: string
  reportsHref: string
  currentReportHref: string | null
}

function matchesSearch(row: V2ResponseSummaryRow, search: string) {
  if (!search) return true

  const haystack = [
    row.participantName,
    row.email,
    row.contextLine,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(search)
}

function averageOf(values: number[]) {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
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

export function V2ResponsesWorkspace({
  rows,
}: {
  rows: V2ResponseSummaryRow[]
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesSearch(row, deferredSearch.trim().toLowerCase())),
    [rows, deferredSearch]
  )
  const responsesWithTraitAverage = rows.filter((row) => row.averageTraitScore !== null).length
  const averageVisibleTraitScore = averageOf(
    filteredRows
      .map((row) => row.averageTraitScore)
      .filter((value): value is number => value !== null)
  )
  const averageVisibleCompletion = averageOf(filteredRows.map((row) => row.completionPercent))

  return (
    <div className="space-y-6">
      <DashboardKpiStrip
        items={[
          { label: 'Responses', value: rows.length },
          { label: 'In view', value: filteredRows.length },
          { label: 'With trait avg', value: responsesWithTraitAverage },
          { label: 'Visible avg', value: averageVisibleTraitScore === null ? '—' : averageVisibleTraitScore.toFixed(1) },
          { label: 'Avg completeness', value: averageVisibleCompletion === null ? '—' : `${averageVisibleCompletion.toFixed(0)}%` },
        ]}
      />

      <DashboardFilterBar>
        <div className="space-y-3">
          <p className="admin-filter-copy">
            Search by participant, email, organisation, or role.
          </p>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search responses"
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2 text-sm text-[var(--admin-text-primary)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[rgba(82,110,255,0.16)] md:w-[28rem]"
          />
        </div>

        <FoundationSurface className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
          Responses focus on neutral review: participant context, completion, trait signal, item-level storage, and report access.
        </FoundationSurface>
      </DashboardFilterBar>

      <DashboardDataTableShell>
        {filteredRows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--admin-text-muted)]">
            {rows.length === 0
              ? 'No responses recorded for this assessment yet.'
              : 'No responses match the current search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Avg trait score</th>
                  <th className="px-4 py-3">Completeness</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
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
                      <td className="px-4 py-4 text-[var(--admin-text-primary)]">
                        {formatMetric(row.averageTraitScore)}
                      </td>
                      <td className="px-4 py-4 text-[var(--admin-text-muted)]">
                        <div className="space-y-1">
                          <p>{row.answeredItems}/{row.totalItems || 0} answered</p>
                          <div className="h-2 w-36 overflow-hidden rounded-full bg-[rgba(103,127,159,0.14)]">
                            <div
                              className="h-full rounded-full bg-[var(--admin-accent)]"
                              style={{ width: `${Math.max(0, Math.min(100, row.completionPercent))}%` }}
                            />
                          </div>
                        </div>
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
    </div>
  )
}
