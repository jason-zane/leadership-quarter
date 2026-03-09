'use client'

import {
  SCALE_POINTS,
} from '@/app/dashboard/assessments/[id]/scoring/_lib/scoring-editor-utils'
import { SectionShell } from '@/app/dashboard/assessments/[id]/scoring/_components/shared'
import type { ScoringConfig } from '@/utils/assessments/types'

export function ScaleSection({
  scaleConfig,
  onPointsChange,
  onLabelChange,
}: {
  scaleConfig: NonNullable<ScoringConfig['scale_config']>
  onPointsChange: (points: number) => void
  onLabelChange: (index: number, value: string) => void
}) {
  return (
    <SectionShell
      title="1. Scale"
      description="Set the response scale used by every question. Score-meaning bands should cover the full scale range."
    >
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Points</label>
          <select
            value={scaleConfig.points}
            onChange={(event) => onPointsChange(Number(event.target.value))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          >
            {SCALE_POINTS.map((points) => (
              <option key={points} value={points}>
                {points}-point
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {scaleConfig.labels.map((label, index) => (
            <label key={index} className="space-y-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Value {index + 1}
              </span>
              <input
                value={label}
                onChange={(event) => onLabelChange(index, event.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}
