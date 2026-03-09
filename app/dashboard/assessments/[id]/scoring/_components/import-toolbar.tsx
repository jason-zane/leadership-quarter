'use client'

import type { ChangeEvent } from 'react'
import {
  buildScoringJsonTemplate,
  serializeScoringConfigToCsv,
} from '@/utils/assessments/scoring-csv'
import type { ScoringConfig } from '@/utils/assessments/types'
import {
  downloadJsonFile,
  downloadTextFile,
} from '@/app/dashboard/assessments/[id]/scoring/_lib/scoring-editor-utils'

export function ImportToolbar({
  config,
  jsonFileInputRef,
  csvFileInputRef,
  onJsonImportChange,
  onCsvImportChange,
}: {
  config: ScoringConfig
  jsonFileInputRef: { current: HTMLInputElement | null }
  csvFileInputRef: { current: HTMLInputElement | null }
  onJsonImportChange: (event: ChangeEvent<HTMLInputElement>) => void
  onCsvImportChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => downloadJsonFile(config, 'scoring-config.json')}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Export JSON
      </button>
      <button
        type="button"
        onClick={() => downloadJsonFile(buildScoringJsonTemplate(config), 'scoring-config-template.json')}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        JSON template
      </button>
      <button
        type="button"
        onClick={() => jsonFileInputRef.current?.click()}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Import JSON
      </button>
      <button
        type="button"
        onClick={() =>
          downloadTextFile(serializeScoringConfigToCsv(config), 'scoring-config.csv', 'text/csv')
        }
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={() =>
          downloadTextFile(
            serializeScoringConfigToCsv(config, { template: true }),
            'scoring-config-template.csv',
            'text/csv'
          )
        }
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        CSV template
      </button>
      <button
        type="button"
        onClick={() => csvFileInputRef.current?.click()}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Import CSV
      </button>
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onJsonImportChange}
      />
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onCsvImportChange}
      />
      <span className="text-xs text-zinc-400">
        JSON remains the full-fidelity format. CSV uses one combined template grouped by scale,
        competencies, bands, classifications, signals, and matrix rows.
      </span>
    </div>
  )
}
