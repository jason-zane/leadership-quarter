'use client'

import { useMemo, useState } from 'react'
import { classifyResult, getBands } from '@/utils/assessments/scoring-engine'
import {
  DEFAULT_SCALE_CONFIG,
  getDimensionBands,
  resolveClassificationCombination,
} from '@/utils/assessments/scoring-config'
import type { ScoringConfig } from '@/utils/assessments/types'
import { MatrixSourceBadge } from '@/app/dashboard/assessments/[id]/scoring/_components/shared'

export function ManualScoreTester({ config }: { config: ScoringConfig }) {
  const [scores, setScores] = useState<Record<string, number>>({})
  const dimensions = config.dimensions
  const scaleMax = config.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points
  const resolvedScores = useMemo(
    () =>
      Object.fromEntries(
        dimensions.map((dimension) => [dimension.key, scores[dimension.key] ?? Math.ceil(scaleMax / 2)])
      ),
    [dimensions, scaleMax, scores]
  )

  const bands = useMemo(() => getBands(resolvedScores, config), [config, resolvedScores])
  const classification = useMemo(() => classifyResult(resolvedScores, config), [config, resolvedScores])

  if (dimensions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
        Add competencies before testing the scoring engine.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Manual score test</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dimensions.map((dimension) => (
          <label key={dimension.key} className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{dimension.label}</span>
            <input
              type="number"
              min={1}
              max={scaleMax}
              step={0.1}
              value={resolvedScores[dimension.key] ?? ''}
              onChange={(event) =>
                setScores((current) => ({ ...current, [dimension.key]: Number(event.target.value) }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Band: {bands[dimension.key] || 'No match'}</p>
          </label>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Classification</p>
        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {classification?.label ?? 'No classification matched'}
        </p>
      </div>
    </div>
  )
}

export function BandProfileTester({ config }: { config: ScoringConfig }) {
  const dimensions = config.dimensions
  const [selectedBands, setSelectedBands] = useState<Record<string, string>>({})
  const resolvedBands = useMemo(
    () =>
      Object.fromEntries(
        dimensions.map((dimension) => {
          const firstBand = getDimensionBands(config, dimension)[0]
          return [dimension.key, selectedBands[dimension.key] ?? firstBand?.key ?? '']
        })
      ),
    [config, dimensions, selectedBands]
  )

  const resolution = useMemo(
    () => resolveClassificationCombination(config, resolvedBands),
    [config, resolvedBands]
  )

  if (dimensions.length === 0) return null

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Band-profile test</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dimensions.map((dimension) => {
          const bands = getDimensionBands(config, dimension)
          return (
            <label key={dimension.key} className="space-y-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{dimension.label}</span>
              <select
                value={resolvedBands[dimension.key] ?? ''}
                onChange={(event) =>
                  setSelectedBands((current) => ({ ...current, [dimension.key]: event.target.value }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {bands.map((band) => (
                  <option key={band.key} value={band.key}>
                    {band.label}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </div>
      <div className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Classification</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {resolution.status === 'matched' ? resolution.classification.label : 'No classification matched'}
            </p>
          </div>
          <MatrixSourceBadge
            source={
              resolution.status === 'matched'
                ? resolution.source === 'override'
                  ? 'manual'
                  : 'generated'
                : 'unmapped'
            }
          />
        </div>
        {resolution.rationale.length ? (
          <div className="mt-3 space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            {resolution.rationale.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
