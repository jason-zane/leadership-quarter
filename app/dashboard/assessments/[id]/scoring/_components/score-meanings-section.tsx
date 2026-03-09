'use client'

import { SectionShell } from '@/app/dashboard/assessments/[id]/scoring/_components/shared'
import { getDimensionBands } from '@/utils/assessments/scoring-config'
import type { ScoringBand, ScoringConfig, ScoringDimension } from '@/utils/assessments/types'

export function ScoreMeaningsSection({
  config,
  scalePoints,
  onAddBand,
  onUpdateBand,
  onRemoveBand,
}: {
  config: ScoringConfig
  scalePoints: number
  onAddBand: (dimension: ScoringDimension) => void
  onUpdateBand: (dimensionKey: string, bandKey: string, patch: Partial<ScoringBand>) => void
  onRemoveBand: (dimensionKey: string, bandKey: string) => void
}) {
  return (
    <SectionShell
      title="3. Score Meanings"
      description="For each competency, define what a score range means. These bands become the building blocks for the overall classification matrix."
    >
      <div className="space-y-4">
        {config.dimensions.map((dimension) => {
          const bands = getDimensionBands(config, dimension)

          return (
            <div
              key={dimension.key}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {dimension.label}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Define what this competency score means across the full scale.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAddBand(dimension)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Add band
                </button>
              </div>

              <div className="space-y-3">
                {bands.map((band) => (
                  <div key={band.key} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <div className="grid gap-3 lg:grid-cols-[140px_1fr_120px_120px]">
                      <label className="space-y-1">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          Band key
                        </span>
                        <input
                          value={band.key ?? ''}
                          onChange={(event) =>
                            onUpdateBand(dimension.key, band.key ?? '', {
                              key: event.target.value,
                            })
                          }
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          Label
                        </span>
                        <input
                          value={band.label}
                          onChange={(event) =>
                            onUpdateBand(dimension.key, band.key ?? '', { label: event.target.value })
                          }
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          Min score
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={scalePoints}
                          step={0.1}
                          value={band.min_score}
                          onChange={(event) =>
                            onUpdateBand(dimension.key, band.key ?? '', {
                              min_score: Number(event.target.value),
                            })
                          }
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                          Max score
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={scalePoints}
                          step={0.1}
                          value={band.max_score ?? scalePoints}
                          onChange={(event) =>
                            onUpdateBand(dimension.key, band.key ?? '', {
                              max_score: Number(event.target.value),
                            })
                          }
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </label>
                    </div>
                    <label className="mt-3 block space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                        Meaning
                      </span>
                      <textarea
                        value={band.meaning ?? ''}
                        onChange={(event) =>
                          onUpdateBand(dimension.key, band.key ?? '', { meaning: event.target.value })
                        }
                        rows={2}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        placeholder="Explain what this score range typically reflects."
                      />
                    </label>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => onRemoveBand(dimension.key, band.key ?? '')}
                        className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove band
                      </button>
                    </div>
                  </div>
                ))}
                {bands.length === 0 ? (
                  <p className="text-sm text-zinc-400">No score meanings defined yet.</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}
