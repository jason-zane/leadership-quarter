'use client'

import { getDimensionBands, type MatrixDraftGenerationSummary, type MatrixPreviewRow } from '@/utils/assessments/scoring-config'
import type { ScoringConfig, ScoringCoverageReport } from '@/utils/assessments/types'
import { SectionShell, MatrixSourceBadge } from '@/app/dashboard/assessments/[id]/scoring/_components/shared'
import type { MatrixStatusFilter } from '@/app/dashboard/assessments/[id]/scoring/_lib/scoring-editor-types'

export function MatrixSection({
  config,
  coverage,
  totalExactCombinations,
  filteredExactCombinations,
  matrixPreview,
  visibleRows,
  matrixPage,
  pageSize,
  matrixStatusFilter,
  matrixClassificationFilter,
  matrixBandFilters,
  lastGenerationSummary,
  onGenerateDraftMappings,
  onClearGeneratedMappings,
  onJumpToUnresolved,
  onMatrixStatusFilterChange,
  onMatrixClassificationFilterChange,
  onMatrixBandFilterChange,
  onClearFilters,
  onPreviousPage,
  onNextPage,
  onSetCombinationClassification,
}: {
  config: ScoringConfig
  coverage: ScoringCoverageReport
  totalExactCombinations: number
  filteredExactCombinations: number
  matrixPreview: {
    grouped: boolean
    total_rows: number
    rows: MatrixPreviewRow[]
  }
  visibleRows: MatrixPreviewRow[]
  matrixPage: number
  pageSize: number
  matrixStatusFilter: MatrixStatusFilter
  matrixClassificationFilter: string
  matrixBandFilters: Record<string, string>
  lastGenerationSummary: MatrixDraftGenerationSummary | null
  onGenerateDraftMappings: () => void
  onClearGeneratedMappings: () => void
  onJumpToUnresolved: () => void
  onMatrixStatusFilterChange: (value: MatrixStatusFilter) => void
  onMatrixClassificationFilterChange: (value: string) => void
  onMatrixBandFilterChange: (dimensionKey: string, bandKey: string) => void
  onClearFilters: () => void
  onPreviousPage: () => void
  onNextPage: () => void
  onSetCombinationClassification: (combination: Record<string, string>, classificationKey: string) => void
}) {
  return (
    <SectionShell
      title="5. Classification Matrix"
      description="Exact manual overrides stay authoritative. Generated rows are a scale-safe preview of the rule engine, not the persisted source of truth."
    >
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {totalExactCombinations.toLocaleString()} exact combinations
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manual: {coverage.manual_combinations} · Generated: {coverage.generated_combinations} ·
              Unresolved: {coverage.unresolved_combinations}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGenerateDraftMappings}
              className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Refresh preview cache
            </button>
            <button
              type="button"
              onClick={onClearGeneratedMappings}
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Clear saved preview
            </button>
            <button
              type="button"
              onClick={onJumpToUnresolved}
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Jump to unresolved
            </button>
          </div>
        </div>

        {lastGenerationSummary ? (
          <GenerationSummary summary={lastGenerationSummary} />
        ) : null}

        {matrixPreview.grouped ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
            This slice is too large to render exactly ({filteredExactCombinations.toLocaleString()}{' '}
            combinations), so the matrix is showing grouped rule profiles. Add more band filters to
            drill into exact combinations before creating manual overrides.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-300">
            This slice is exact. Changing a classification here creates or updates an exact manual
            override for that competency-band combination.
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[160px_180px_repeat(auto-fit,minmax(160px,1fr))]">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Status</span>
            <select
              value={matrixStatusFilter}
              onChange={(event) => onMatrixStatusFilterChange(event.target.value as MatrixStatusFilter)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="all">All rows</option>
              <option value="manual">Manual only</option>
              <option value="generated">Generated only</option>
              <option value="unmapped">Unmapped only</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Classification
            </span>
            <select
              value={matrixClassificationFilter}
              onChange={(event) => onMatrixClassificationFilterChange(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">All classifications</option>
              {config.classifications.map((classification) => (
                <option key={classification.key} value={classification.key}>
                  {classification.label}
                </option>
              ))}
            </select>
          </label>

          {config.dimensions.map((dimension) => (
            <label key={dimension.key} className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {dimension.label}
              </span>
              <select
                value={matrixBandFilters[dimension.key] ?? ''}
                onChange={(event) => onMatrixBandFilterChange(dimension.key, event.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">All bands</option>
                {getDimensionBands(config, dimension).map((band) => (
                  <option key={band.key} value={band.key}>
                    {band.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear filters
          </button>
          <span className="text-xs text-zinc-400">
            Showing {visibleRows.length} rows from {matrixPreview.total_rows.toLocaleString()} preview
            rows.
          </span>
        </div>

        {matrixPreview.total_rows > pageSize ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={matrixPage === 0}
              className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
            >
              Previous
            </button>
            <span>
              Page {matrixPage + 1} of {Math.max(1, Math.ceil(matrixPreview.total_rows / pageSize))}
            </span>
            <button
              type="button"
              onClick={onNextPage}
              disabled={matrixPage >= Math.ceil(matrixPreview.total_rows / pageSize) - 1}
              className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
            >
              Next
            </button>
          </div>
        ) : null}

        {config.dimensions.length === 0 ? (
          <p className="text-sm text-zinc-400">Add competencies and score meanings first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  {config.dimensions.map((dimension) => (
                    <th key={dimension.key} className="px-3 py-2 font-medium">
                      {dimension.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Classification</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={[
                      'border-t border-zinc-100 dark:border-zinc-800',
                      row.source === 'generated'
                        ? 'bg-blue-50/40 dark:bg-blue-950/10'
                        : row.source === 'unmapped'
                          ? 'bg-amber-50/40 dark:bg-amber-950/10'
                          : '',
                    ].join(' ')}
                  >
                    {config.dimensions.map((dimension) => {
                      const bandKey = row.combination[dimension.key]
                      const band = getDimensionBands(config, dimension).find((item) => item.key === bandKey)
                      return (
                        <td key={`${index}-${dimension.key}`} className="px-3 py-2 align-top">
                          <div>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100">
                              {bandKey === '*' ? 'Any' : band?.label ?? bandKey}
                            </p>
                            <p className="font-mono text-[11px] text-zinc-400">{bandKey}</p>
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 align-top">
                      <select
                        value={row.classification_key ?? ''}
                        onChange={(event) => onSetCombinationClassification(row.combination, event.target.value)}
                        disabled={!row.editable}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                      >
                        <option value="">Select classification</option>
                        {config.classifications.map((classification) => (
                          <option key={classification.key} value={classification.key}>
                            {classification.label}
                          </option>
                        ))}
                      </select>
                      {!row.editable ? (
                        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                          Filter further to create an exact override from this grouped row.
                        </p>
                      ) : null}
                      {row.rationale.length ? (
                        <div className="mt-2 space-y-1 rounded-md bg-blue-50 px-3 py-2 text-[11px] text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                          {row.rationale.map((line, rationaleIndex) => (
                            <p key={rationaleIndex}>{line}</p>
                          ))}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <MatrixSourceBadge source={row.source} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionShell>
  )
}

function GenerationSummary({ summary }: { summary: MatrixDraftGenerationSummary }) {
  return (
    <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200 md:grid-cols-5">
      <div>
        <p className="font-medium">Assigned</p>
        <p className="mt-1">{summary.assigned}</p>
      </div>
      <div>
        <p className="font-medium">Left blank</p>
        <p className="mt-1">{summary.left_blank}</p>
      </div>
      <div>
        <p className="font-medium">Changed</p>
        <p className="mt-1">{summary.changed}</p>
      </div>
      <div>
        <p className="font-medium">Ambiguous</p>
        <p className="mt-1">{summary.ambiguous}</p>
      </div>
      <div>
        <p className="font-medium">No match</p>
        <p className="mt-1">{summary.no_match}</p>
      </div>
    </div>
  )
}
