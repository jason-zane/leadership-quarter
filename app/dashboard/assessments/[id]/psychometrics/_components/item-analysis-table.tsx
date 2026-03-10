'use client'

import { useState } from 'react'
import type { ItemAnalytics } from '@/utils/services/admin-assessment-analytics'
import { Badge } from '@/components/ui/badge'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type SortKey = 'questionKey' | 'dimension' | 'mean' | 'citc' | 'discriminationIndex' | 'alphaIfDeleted' | 'missingPct'
type SortDir = 'asc' | 'desc'

function buildItemHealthTooltip(item: ItemAnalytics): string {
  const reasons: string[] = []
  if (item.citc !== null && item.citc < 0.2)
    reasons.push(`Item-scale correlation is very low (${item.citc.toFixed(2)}). This item does not reliably measure the same thing as the rest of its competency. Consider rewording or removing it.`)
  else if (item.citc !== null && item.citc < 0.3)
    reasons.push(`Item-scale correlation is below ideal (${item.citc.toFixed(2)}). The item is weakly related to its competency. Monitor this as more data comes in.`)
  if (item.citc !== null && item.citc > 0.7)
    reasons.push(`Item-scale correlation is very high (${item.citc.toFixed(2)}). This item may be nearly identical to another item in the same competency. Consider whether both are needed.`)
  if (item.missingPct >= 0.15)
    reasons.push(`${(item.missingPct * 100).toFixed(0)}% of respondents skipped this item. High skip rates may indicate the item is confusing or sensitive.`)
  else if (item.missingPct >= 0.05)
    reasons.push(`${(item.missingPct * 100).toFixed(0)}% missing responses. Worth monitoring.`)
  if (item.ceilingPct >= 0.5)
    reasons.push(`${(item.ceilingPct * 100).toFixed(0)}% of respondents chose the highest option. The item may be too easy or positively biased.`)
  if (item.floorPct >= 0.5)
    reasons.push(`${(item.floorPct * 100).toFixed(0)}% chose the lowest option. The item may be too hard or negatively biased.`)
  if (reasons.length === 0) reasons.push('No issues detected.')
  if (item.reverseScored) {
    reasons.push(
      'This item is reverse-coded. All metrics including item-scale correlation are calculated using the reversed values, so a low score here is a real concern, not an artefact of the reverse coding.'
    )
  }
  return reasons.join(' ')
}

function sortValue(item: ItemAnalytics, key: SortKey): number | string | null {
  switch (key) {
    case 'questionKey': return item.questionKey
    case 'dimension': return item.dimension ?? ''
    case 'mean': return item.mean
    case 'citc': return item.citc
    case 'discriminationIndex': return item.discriminationIndex
    case 'alphaIfDeleted': return item.alphaIfDeleted
    case 'missingPct': return item.missingPct
  }
}

function SortHeader({
  col,
  label,
  title,
  sortKey,
  sortDir,
  onSort,
}: {
  col: SortKey
  label: string
  title?: string
  sortKey: SortKey
  sortDir: SortDir
  onSort: (col: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)]">
      <button
        onClick={() => onSort(col)}
        title={title}
        className="flex items-center gap-1 text-xs uppercase tracking-[0.08em] hover:text-[var(--admin-text)] transition-colors"
      >
        {label}
        <span className="ml-0.5 text-[10px]">
          {active ? (sortDir === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}
        </span>
      </button>
    </th>
  )
}

export function ItemAnalysisTable({ items, n }: { items: ItemAnalytics[]; n: number }) {
  const [sortKey, setSortKey] = useState<SortKey>('questionKey')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = [...items].sort((a, b) => {
    const av = sortValue(a, sortKey)
    const bv = sortValue(b, sortKey)
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    if (typeof av === 'string' && typeof bv === 'string') {
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    }
    const cmp = (av as number) - (bv as number)
    return sortDir === 'asc' ? cmp : -cmp
  })

  const sortProps = { sortKey, sortDir, onSort: handleSort }

  return (
    <>
    {n < 15 && n > 0 && (
      <div className="rounded-[16px] border border-[var(--admin-border)] bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
        <strong>Small sample ({n} complete responses).</strong> Cronbach&apos;s alpha, item-scale correlation, and discrimination statistics require at least 15–20 respondents per scale to be stable. Treat all values below as exploratory only — they will shift significantly as more data comes in.
      </div>
    )}
    <details className="rounded-[16px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm mb-4">
      <summary className="cursor-pointer font-medium text-[var(--admin-text)]">
        What do these metrics mean?
      </summary>
      <dl className="mt-3 space-y-3 text-[var(--admin-text-muted)]">
        <div>
          <dt className="font-medium text-[var(--admin-text)]">Mean (average response)</dt>
          <dd className="mt-0.5">
            The average response value for this item across all scored respondents. For a standard 1–5 scale,
            values near 1 or 5 may indicate ceiling or floor effects (everyone choosing the same end of the
            scale). For reverse-coded items (shown with an RC badge), the mean displayed is the{' '}
            <em>reversed</em> value — a raw answer of 2 on a 5-point scale is stored as 4 before any
            statistics are computed. This means the mean reflects how the item behaves within the scale, not
            the literal number respondents clicked.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--admin-text)]">Item-scale correlation</dt>
          <dd className="mt-0.5">
            How well this item moves in sync with the other items in its competency. Range: −1 to 1. Ideal:
            0.30–0.70. Below 0.20 means the item may not be measuring the same construct as its peers —
            consider rewording or removing it. For reverse-coded items, the correlation is computed after
            reversal, so a strong positive CITC on an RC item confirms it is measuring the same thing as its
            peers — just with the scale flipped.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--admin-text)]">Discrimination</dt>
          <dd className="mt-0.5">
            How well the item separates high scorers from low scorers. Calculated by comparing the average
            response of the top 27% of respondents to the bottom 27%, divided by the scale range. Range: −1
            to 1. Colour guide: <span className="text-green-700 font-medium">green ≥ 0.30</span> (good),
            plain = 0.20–0.29 (borderline), <span className="text-[var(--admin-text-muted)]">muted &lt; 0.20</span>{' '}
            (poor — this item does not separate high and low scorers). Negative values mean the item
            behaves backwards relative to the scale.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--admin-text)]">Item health signal (OK / Watch / Review)</dt>
          <dd className="mt-0.5">
            A summary flag computed from the other metrics. Decision rules:{' '}
            <strong>Review</strong> (red) if item-scale correlation is below 0.20 or more than 15% of
            responses are missing.{' '}
            <strong>Watch</strong> (amber) if correlation is below 0.30, more than 5% missing, or 50%+
            of respondents chose the ceiling or floor response.{' '}
            <strong>OK</strong> (green) if none of the above apply. Hover the badge to see which specific
            condition triggered the flag.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--admin-text)]">Reliability if removed</dt>
          <dd className="mt-0.5">
            The competency&apos;s Cronbach&apos;s alpha (α) if this item were dropped from the scale.
            Range: (−∞, 1]. If this number is higher than the current α shown in the Dimension Reliability
            section, removing the item would improve overall consistency. Values outside [−1, 1] appear only
            with very small samples (n &lt; ~10) where variance estimates are too noisy to be meaningful —
            treat them as directional only and wait for more data.
          </dd>
        </div>
      </dl>
    </details>
    <DashboardDataTableShell>
      <table className="w-full text-left text-sm">
        <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em]">
          <tr>
            <SortHeader col="questionKey" label="Item" {...sortProps} />
            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)] text-xs uppercase tracking-[0.08em]">
              RC
            </th>
            <SortHeader col="dimension" label="Competency" {...sortProps} />
            <th className="px-4 py-3 font-medium text-[var(--admin-text-muted)] text-xs uppercase tracking-[0.08em]">
              Health
            </th>
            <SortHeader col="mean" label="Mean" {...sortProps} />
            <SortHeader
              col="citc"
              label="Item-scale correlation"
              title="Corrected item-total correlation (rest-score method). Ideal range: 0.30–0.70. Below 0.20 = review needed."
              {...sortProps}
            />
            <SortHeader col="discriminationIndex" label="Discrimination" {...sortProps} />
            <SortHeader col="alphaIfDeleted" label="Reliability if removed" {...sortProps} />
            <SortHeader col="missingPct" label="Missing" {...sortProps} />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-3 text-sm text-[var(--admin-text-muted)]">
                No item diagnostics are available yet.
              </td>
            </tr>
          ) : (
            sorted.map((item) => {
              const healthLabel =
                item.healthSignal === 'red' ? 'Review' : item.healthSignal === 'amber' ? 'Watch' : 'OK'
              const healthVariant =
                item.healthSignal === 'red'
                  ? 'signal-red'
                  : item.healthSignal === 'amber'
                    ? 'signal-amber'
                    : 'signal-green'
              const tooltip = buildItemHealthTooltip(item)
              return (
                <tr
                  key={item.questionId}
                  className="border-t border-[rgba(103,127,159,0.12)] hover:bg-[rgba(103,127,159,0.04)]"
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-[var(--admin-text)]">{item.questionKey}</div>
                    <div className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{item.text}</div>
                  </td>
                  <td className="px-4 py-3">
                    {item.reverseScored && (
                      <span title="Reverse-coded item">
                        <Badge variant="signal-amber">RC</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{item.dimension ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span title={tooltip}>
                      <Badge variant={healthVariant}>{healthLabel}</Badge>
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.mean.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {item.citc !== null ? (
                      <span className={item.citc >= 0.3 && item.citc <= 0.7 ? 'text-green-700 font-medium' : ''}>
                        {item.citc.toFixed(3)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.discriminationIndex !== null ? (
                      <span
                        className={
                          item.discriminationIndex >= 0.30
                            ? 'text-green-700 font-medium'
                            : item.discriminationIndex >= 0.20
                              ? ''
                              : 'text-[var(--admin-text-muted)]'
                        }
                      >
                        {item.discriminationIndex.toFixed(3)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {item.alphaIfDeleted !== null ? (() => {
                      const isExtreme = item.alphaIfDeleted < -1 || item.alphaIfDeleted > 1
                      return isExtreme ? (
                        <span
                          className="text-[var(--admin-text-muted)] italic"
                          title="Value is outside the normal [−1, 1] range. This happens only with very small samples — the estimate is too noisy to interpret. It will stabilise once more responses come in."
                        >
                          {item.alphaIfDeleted.toFixed(3)}
                        </span>
                      ) : (
                        <span>{item.alphaIfDeleted.toFixed(3)}</span>
                      )
                    })() : '—'}
                  </td>
                  <td className="px-4 py-3">{(item.missingPct * 100).toFixed(0)}%</td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </DashboardDataTableShell>
    </>
  )
}
