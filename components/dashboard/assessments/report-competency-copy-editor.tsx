'use client'

import type { ReportCompetencyOverrides, ReportProfileOverride } from '@/utils/assessments/experience-config'
import type { ReportProfileDefinition } from '@/utils/reports/report-overrides'

type Props = {
  title?: string
  description?: string
  emptyStateCopy?: string
  lowAnchorLabel?: string
  highAnchorLabel?: string
  showAnchors?: boolean
  competencies: ReportProfileDefinition[]
  value: Record<string, ReportProfileOverride>
  onChange: (next: ReportCompetencyOverrides) => void
}

export function ReportCompetencyCopyEditor({
  title = 'Competency copy',
  description = 'Override the public label and description used on report cards. Leave fields blank to use the assessment defaults.',
  emptyStateCopy = 'No competencies found yet. Add competencies in the assessment before configuring report copy.',
  lowAnchorLabel = 'Low anchor',
  highAnchorLabel = 'High anchor',
  showAnchors = false,
  competencies,
  value,
  onChange,
}: Props) {
  function updateCompetency(
    key: string,
    field: 'label' | 'description' | 'low_anchor' | 'high_anchor',
    nextValue: string
  ) {
    const current = value[key] ?? {}
    const trimmed = nextValue.trim()
    const nextOverride = {
      ...current,
      [field]: trimmed || undefined,
    }

    const cleaned = Object.fromEntries(
      Object.entries({
        label: nextOverride.label?.trim() || undefined,
        description: nextOverride.description?.trim() || undefined,
        low_anchor: nextOverride.low_anchor?.trim() || undefined,
        high_anchor: nextOverride.high_anchor?.trim() || undefined,
      }).filter(([, fieldValue]) => Boolean(fieldValue))
    )

    if (Object.keys(cleaned).length === 0) {
      const rest = { ...value }
      delete rest[key]
      onChange(rest)
      return
    }

    onChange({
      ...value,
      [key]: cleaned,
    })
  }

  function clearCompetency(key: string) {
    const rest = { ...value }
    delete rest[key]
    onChange(rest)
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>

      {competencies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {emptyStateCopy}
        </p>
      ) : (
        <div className="space-y-4">
          {competencies.map((competency) => {
            const override = value[competency.key] ?? {}

            return (
              <div
                key={competency.key}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{competency.internalLabel}</p>
                    <p className="mt-1 font-mono text-[11px] text-zinc-400">{competency.key}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearCompetency(competency.key)}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  >
                    Clear override
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Public label</span>
                    <input
                      value={override.label ?? ''}
                      onChange={(event) => updateCompetency(competency.key, 'label', event.target.value)}
                      placeholder={competency.internalLabel}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Public description</span>
                    <textarea
                      value={override.description ?? ''}
                      onChange={(event) => updateCompetency(competency.key, 'description', event.target.value)}
                      placeholder={competency.defaultDescription ?? 'No default description set.'}
                      rows={3}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  </label>

                  {competency.defaultDescription ? (
                    <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      Default description: {competency.defaultDescription}
                    </p>
                  ) : null}

                  {showAnchors ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{lowAnchorLabel}</span>
                        <textarea
                          value={override.low_anchor ?? ''}
                          onChange={(event) => updateCompetency(competency.key, 'low_anchor', event.target.value)}
                          placeholder="Describe what lower-end performance typically looks like."
                          rows={3}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{highAnchorLabel}</span>
                        <textarea
                          value={override.high_anchor ?? ''}
                          onChange={(event) => updateCompetency(competency.key, 'high_anchor', event.target.value)}
                          placeholder="Describe what higher-end performance typically looks like."
                          rows={3}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
