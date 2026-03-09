'use client'

import { SectionShell } from '@/app/dashboard/assessments/[id]/scoring/_components/shared'
import { ClassificationSignalEditor } from '@/app/dashboard/assessments/[id]/scoring/_components/classification-signal-editor'
import type {
  ScoringClassification,
  ScoringClassificationExclusion,
  ScoringClassificationSignal,
  ScoringConfig,
} from '@/utils/assessments/types'

export function ClassificationsSection({
  config,
  newClassificationLabel,
  newRecommendation,
  onNewClassificationLabelChange,
  onAddClassification,
  onDeleteClassification,
  onUpdateClassification,
  onAddRecommendation,
  onNewRecommendationChange,
  onUpdateRecommendation,
  onRemoveRecommendation,
  onAddPreferredSignal,
  onUpdatePreferredSignal,
  onRemovePreferredSignal,
  onAddExcludedSignal,
  onUpdateExcludedSignal,
  onRemoveExcludedSignal,
}: {
  config: ScoringConfig
  newClassificationLabel: string
  newRecommendation: Record<string, string>
  onNewClassificationLabelChange: (value: string) => void
  onAddClassification: () => void
  onDeleteClassification: (classificationKey: string) => void
  onUpdateClassification: (
    classificationKey: string,
    patch: Partial<ScoringClassification>
  ) => void
  onAddRecommendation: (classificationKey: string) => void
  onNewRecommendationChange: (classificationKey: string, value: string) => void
  onUpdateRecommendation: (classificationKey: string, index: number, value: string) => void
  onRemoveRecommendation: (classificationKey: string, index: number) => void
  onAddPreferredSignal: (classificationKey: string) => void
  onUpdatePreferredSignal: (
    classificationKey: string,
    index: number,
    patch: Partial<ScoringClassificationSignal>
  ) => void
  onRemovePreferredSignal: (classificationKey: string, index: number) => void
  onAddExcludedSignal: (classificationKey: string) => void
  onUpdateExcludedSignal: (
    classificationKey: string,
    index: number,
    patch: Partial<ScoringClassificationExclusion>
  ) => void
  onRemoveExcludedSignal: (classificationKey: string, index: number) => void
}) {
  return (
    <SectionShell
      title="4. Classifications"
      description="Define the overall outcomes, their recommendations, and the signal rules the draft matrix generator should follow."
    >
      <div className="space-y-4">
        {config.classifications.map((classification) => (
          <div
            key={classification.key}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {classification.label}
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-400">{classification.key}</p>
              </div>
              <button
                type="button"
                onClick={() => onDeleteClassification(classification.key)}
                className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Label</span>
                <input
                  value={classification.label}
                  onChange={(event) =>
                    onUpdateClassification(classification.key, { label: event.target.value })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Description
                </span>
                <input
                  value={classification.description ?? ''}
                  onChange={(event) =>
                    onUpdateClassification(classification.key, { description: event.target.value })
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Automation rationale
              </span>
              <textarea
                rows={2}
                value={classification.automation_rationale ?? ''}
                onChange={(event) =>
                  onUpdateClassification(classification.key, {
                    automation_rationale: event.target.value,
                  })
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                placeholder="Explain the logic behind this classification so generated mappings stay interpretable."
              />
            </label>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <ClassificationSignalEditor
                title="Preferred signals"
                description="Use these to express the competency-band patterns that should pull combinations into this classification."
                mode="preferred"
                config={config}
                signals={classification.preferred_signals ?? []}
                onAdd={() => onAddPreferredSignal(classification.key)}
                onChange={(index, patch) =>
                  onUpdatePreferredSignal(
                    classification.key,
                    index,
                    patch as Partial<ScoringClassificationSignal>
                  )
                }
                onRemove={(index) => onRemovePreferredSignal(classification.key, index)}
              />
              <ClassificationSignalEditor
                title="Exclusions"
                description="Use these to block combinations that should never land in this classification."
                mode="excluded"
                config={config}
                signals={classification.excluded_signals ?? []}
                onAdd={() => onAddExcludedSignal(classification.key)}
                onChange={(index, patch) =>
                  onUpdateExcludedSignal(
                    classification.key,
                    index,
                    patch as Partial<ScoringClassificationExclusion>
                  )
                }
                onRemove={(index) => onRemoveExcludedSignal(classification.key, index)}
              />
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Recommendations</p>
              {classification.recommendations.map((recommendation, index) => (
                <div key={`${classification.key}-${index}`} className="flex items-start gap-2">
                  <textarea
                    value={recommendation}
                    onChange={(event) =>
                      onUpdateRecommendation(classification.key, index, event.target.value)
                    }
                    rows={2}
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveRecommendation(classification.key, index)}
                    className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  value={newRecommendation[classification.key] ?? ''}
                  onChange={(event) =>
                    onNewRecommendationChange(classification.key, event.target.value)
                  }
                  placeholder="Add recommendation"
                  className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                <button
                  type="button"
                  onClick={() => onAddRecommendation(classification.key)}
                  className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newClassificationLabel}
          onChange={(event) => onNewClassificationLabelChange(event.target.value)}
          placeholder="Classification label"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="button"
          onClick={onAddClassification}
          disabled={!newClassificationLabel.trim()}
          className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add classification
        </button>
      </div>
    </SectionShell>
  )
}
