import Link from 'next/link'
import { classificationColors, formatShortDate, type Submission } from '../_lib/responses-page'
import { ScorePill } from './score-pill'
import { ActionMenu } from '@/components/ui/action-menu'

export function ResponsesTable({
  surveyId,
  rows,
  loading,
  selectMode,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  busySubmissionId,
  onUpdateAnalysisState,
  onDeleteSubmission,
}: {
  surveyId: string
  rows: Submission[]
  loading: boolean
  selectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  busySubmissionId: string | null
  onUpdateAnalysisState: (id: string, excludedFromAnalysis: boolean) => Promise<void> | void
  onDeleteSubmission: (id: string) => Promise<void> | void
}) {
  const colSpan = selectMode ? 8 : 7

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
          <tr>
            {selectMode && (
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selectedIds.size === rows.length}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                />
              </th>
            )}
            <th className="px-4 py-3 font-medium">Classification</th>
            <th className="px-4 py-3 font-medium">Respondent</th>
            <th className="px-4 py-3 font-medium">Organisation</th>
            <th className="px-4 py-3 font-medium">Analysis</th>
            <th className="px-4 py-3 font-medium" title="Openness · Risk Posture · Capability">Scores (O · R · C)</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-zinc-400">
                Loading...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-zinc-400">
                No responses yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const classificationKey = row.classification?.key ?? ''
              const classificationLabel = row.classification?.label ?? 'Unknown'
              const colorClass =
                classificationColors[classificationKey] ?? classificationColors.developing_operator
              const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || '-'
              const isSelected = selectedIds.has(row.id)
              const busy = busySubmissionId === row.id

              return (
                <tr
                  key={row.id}
                  className={[
                    'border-t border-zinc-100 dark:border-zinc-800',
                    isSelected
                      ? 'bg-zinc-50 dark:bg-zinc-800/40'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
                  ].join(' ')}
                  onClick={selectMode ? () => onToggleSelect(row.id) : undefined}
                  style={selectMode ? { cursor: 'pointer' } : undefined}
                >
                  {selectMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(row.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/assessments/${surveyId}/responses/${row.id}`}
                      onClick={(event) => {
                        if (selectMode) event.preventDefault()
                      }}
                    >
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
                        {classificationLabel}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{name}</td>
                  <td className="px-4 py-3 text-zinc-500">{row.organisation ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium',
                        row.excluded_from_analysis
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                      ].join(' ')}
                    >
                      {row.excluded_from_analysis ? 'Ignored' : 'Included'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" title="Openness · Risk Posture · Capability">
                      <ScorePill label="O" value={row.scores?.openness} />
                      <span className="text-zinc-300">&middot;</span>
                      <ScorePill label="R" value={row.scores?.riskPosture} />
                      <span className="text-zinc-300">&middot;</span>
                      <ScorePill label="C" value={row.scores?.capability} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatShortDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <ActionMenu
                      items={[
                        {
                          type: 'item',
                          label: row.excluded_from_analysis ? 'Include in analysis' : 'Ignore from analysis',
                          onSelect: () => {
                            void onUpdateAnalysisState(row.id, !row.excluded_from_analysis)
                          },
                          disabled: busy,
                        },
                        {
                          type: 'item',
                          label: 'View submission',
                          onSelect: () => {
                            window.location.href = `/dashboard/assessments/${surveyId}/responses/${row.id}`
                          },
                        },
                        { type: 'separator' },
                        {
                          type: 'item',
                          label: 'Delete',
                          onSelect: () => { void onDeleteSubmission(row.id) },
                          destructive: true,
                          disabled: busy,
                        },
                      ]}
                    />
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
