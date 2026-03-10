import { exportResponsesCsv, type Submission } from '../_lib/responses-page'

export function ResponsesToolbar({
  rows,
  selectMode,
  selectedIds,
  selectedCount,
  bulkBusy,
  onToggleSelectMode,
  onOpenCohorts,
  onBulkIgnore,
  onBulkInclude,
  onBulkDelete,
}: {
  rows: Submission[]
  selectMode: boolean
  selectedIds: Set<string>
  selectedCount: number
  bulkBusy: boolean
  onToggleSelectMode: () => void
  onOpenCohorts: () => void
  onBulkIgnore: () => void
  onBulkInclude: () => void
  onBulkDelete: () => void
}) {
  const includedCount = rows.filter((row) => !row.excluded_from_analysis).length
  const ignoredCount = rows.length - includedCount

  const selectedRows = rows.filter((row) => selectedIds.has(row.id))
  const anyIncluded = selectedRows.some((row) => !row.excluded_from_analysis)
  const anyIgnored = selectedRows.some((row) => row.excluded_from_analysis)

  const btnBase = 'rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-40'
  const btnDefault = `${btnBase} border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800`
  const btnDestructive = `${btnBase} border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20`

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-500">
        {rows.length} response{rows.length !== 1 ? 's' : ''} · {includedCount} in analysis
        {ignoredCount > 0 ? ` · ${ignoredCount} ignored` : ''}
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
          <>
            {anyIncluded && (
              <button
                onClick={onBulkIgnore}
                disabled={bulkBusy}
                className={btnDefault}
              >
                Ignore from analysis
              </button>
            )}
            {anyIgnored && (
              <button
                onClick={onBulkInclude}
                disabled={bulkBusy}
                className={btnDefault}
              >
                Include in analysis
              </button>
            )}
            <button
              onClick={onOpenCohorts}
              disabled={bulkBusy}
              className={btnDefault}
            >
              Save as cohort
            </button>
            <button
              onClick={onBulkDelete}
              disabled={bulkBusy}
              className={btnDestructive}
            >
              Delete
            </button>
          </>
        )}

        <button
          onClick={() => exportResponsesCsv(rows)}
          disabled={rows.length === 0}
          className={btnDefault}
        >
          Export CSV
        </button>
      </div>
    </div>
  )
}
