'use client'

import { SectionShell } from '@/app/dashboard/assessments/[id]/scoring/_components/shared'
import type { Question } from '@/app/dashboard/assessments/[id]/scoring/_lib/scoring-editor-types'
import { getDimensionBands } from '@/utils/assessments/scoring-config'
import type { ScoringConfig } from '@/utils/assessments/types'

export function CompetenciesSection({
  config,
  questions,
  scalePoints,
}: {
  config: ScoringConfig
  questions: Question[]
  scalePoints: number
}) {
  return (
    <SectionShell
      title="2. Competencies"
      description="Competencies come from the Questions tab. This section shows whether each competency has enough items and enough scoring detail."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {config.dimensions.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
            No competencies yet. Add them in the Questions tab first.
          </div>
        ) : (
          config.dimensions.map((dimension) => {
            const questionCount = questions.filter(
              (question) => question.dimension === dimension.key && question.is_active
            ).length
            const bands = getDimensionBands(config, dimension)

            return (
              <div
                key={dimension.key}
                className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {dimension.label}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-zinc-400">{dimension.key}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {questionCount} questions
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                    <p className="font-medium text-zinc-700 dark:text-zinc-200">Meaning bands</p>
                    <p className="mt-1">{bands.length}</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                    <p className="font-medium text-zinc-700 dark:text-zinc-200">Coverage</p>
                    <p className="mt-1">
                      {bands.length > 0
                        ? `${bands[0].min_score} to ${bands.at(-1)?.max_score ?? scalePoints}`
                        : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </SectionShell>
  )
}
