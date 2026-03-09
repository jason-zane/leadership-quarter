import type { ChangeEvent, FormEvent } from 'react'
import { toKey } from '../_lib/questions-editor'

export function QuestionsToolbar({
  questionCount,
  newConstructLabel,
  addingConstruct,
  fileInputRef,
  onConstructLabelChange,
  onAddConstruct,
  onDownloadTemplate,
  onFileChange,
}: {
  questionCount: number
  newConstructLabel: string
  addingConstruct: boolean
  fileInputRef: { current: HTMLInputElement | null }
  onConstructLabelChange: (value: string) => void
  onAddConstruct: (event: FormEvent<HTMLFormElement>) => Promise<void>
  onDownloadTemplate: () => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  const constructKeyPreview = newConstructLabel.trim() ? toKey(newConstructLabel.trim()) : ''

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        {questionCount} question{questionCount !== 1 ? 's' : ''}
      </span>

      <form
        onSubmit={(event) => {
          void onAddConstruct(event)
        }}
        className="flex items-center gap-2"
      >
        <input
          value={newConstructLabel}
          onChange={(event) => onConstructLabelChange(event.target.value)}
          placeholder="New construct label"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {constructKeyPreview && <span className="font-mono text-xs text-zinc-400">{constructKeyPreview}</span>}
        <button
          type="submit"
          disabled={addingConstruct || !newConstructLabel.trim()}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add construct
        </button>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onDownloadTemplate}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Download CSV template
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Upload CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  )
}
