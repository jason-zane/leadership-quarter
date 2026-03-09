import { groupCsvRowsByConstruct, type CsvRow } from '../_lib/questions-editor'

export function CsvPreviewModal({
  rows,
  onConfirm,
  onCancel,
}: {
  rows: CsvRow[]
  onConfirm: () => void
  onCancel: () => void
}) {
  const rowsByConstruct = groupCsvRowsByConstruct(rows)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          CSV preview - {rows.length} item{rows.length !== 1 ? 's' : ''}
        </h3>
        <div className="flex-1 space-y-4 overflow-y-auto">
          {Object.entries(rowsByConstruct).map(([key, { label, items }]) => (
            <div key={key}>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {label} <span className="font-mono font-normal text-zinc-400">({key})</span>
                <span className="ml-2 text-zinc-400">- {items.length} item{items.length !== 1 ? 's' : ''}</span>
              </p>
              <ul className="mt-1 space-y-0.5 pl-3">
                {items.map((item, index) => (
                  <li
                    key={`${key}-${index}`}
                    className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <span className="shrink-0">{index + 1}.</span>
                    <span>
                      {item.item_text}
                      {item.reverse_coded && <span className="ml-1 text-amber-600"> (RC)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  )
}
