import { exportResponsesCsv, type Submission } from '../_lib/responses-page'

export function ResponsesToolbar({
  rows,
  selectMode,
  selectedCount,
  onToggleSelectMode,
  onOpenCohorts,
}: {
  rows: Submission[]
  selectMode: boolean
  selectedCount: number
  onToggleSelectMode: () => void
  onOpenCohorts: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-500">
        {rows.length} response{rows.length !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSelectMode}
          className={[
            'rounded-md border px-3 py-2 text-sm font-medium',
            selectMode
              ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
              : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800',
          ].join(' ')}
        >
          {selectMode ? `Selecting (${selectedCount})` : 'Select'}
        </button>
        {selectMode && selectedCount > 0 && (
          <button
            onClick={onOpenCohorts}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Save as cohort
          </button>
        )}
        <button
          onClick={() => exportResponsesCsv(rows)}
          disabled={rows.length === 0}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Export CSV
        </button>
      </div>
    </div>
  )
}
