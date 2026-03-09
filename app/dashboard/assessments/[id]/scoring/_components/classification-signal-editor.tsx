'use client'

import { getDimensionBands } from '@/utils/assessments/scoring-config'
import type {
  ScoringClassificationExclusion,
  ScoringClassificationSignal,
  ScoringConfig,
} from '@/utils/assessments/types'

export function ClassificationSignalEditor({
  title,
  description,
  mode,
  config,
  signals,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string
  description: string
  mode: 'preferred' | 'excluded'
  config: ScoringConfig
  signals: Array<ScoringClassificationSignal | ScoringClassificationExclusion>
  onAdd: () => void
  onChange: (
    index: number,
    patch: Partial<ScoringClassificationSignal> | Partial<ScoringClassificationExclusion>
  ) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{title}</p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Add {mode === 'preferred' ? 'signal' : 'exclusion'}
        </button>
      </div>

      {signals.length === 0 ? (
        <p className="text-xs text-zinc-400">
          {mode === 'preferred'
            ? 'No preferred signals yet. Add the competency-band patterns that should push this classification forward.'
            : 'No exclusions yet. Add any competency-band states that should automatically disqualify this classification.'}
        </p>
      ) : null}

      {signals.map((signal, index) => {
        const dimension = config.dimensions.find((item) => item.key === signal.dimension)
        const bands = dimension ? getDimensionBands(config, dimension) : []
        return (
          <div
            key={`${mode}-${index}`}
            className="grid gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 lg:grid-cols-[1fr_1fr_120px_auto]"
          >
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Competency</span>
              <select
                value={signal.dimension}
                onChange={(event) => {
                  const nextDimensionKey = event.target.value
                  const nextDimension = config.dimensions.find((item) => item.key === nextDimensionKey)
                  const nextBandKey = nextDimension ? getDimensionBands(config, nextDimension)[0]?.key ?? '' : ''
                  onChange(index, { dimension: nextDimensionKey, band_key: nextBandKey })
                }}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {config.dimensions.map((dimensionOption) => (
                  <option key={dimensionOption.key} value={dimensionOption.key}>
                    {dimensionOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Band</span>
              <select
                value={signal.band_key}
                onChange={(event) => onChange(index, { band_key: event.target.value })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {bands.map((band) => (
                  <option key={band.key} value={band.key}>
                    {band.label}
                  </option>
                ))}
              </select>
            </label>

            {mode === 'preferred' ? (
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Weight</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={'weight' in signal ? signal.weight : 1}
                  onChange={(event) => onChange(index, { weight: Number(event.target.value) || 1 })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            ) : (
              <div className="flex items-end text-[11px] text-zinc-500 dark:text-zinc-400">
                Blocks this classification when matched.
              </div>
            )}

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
