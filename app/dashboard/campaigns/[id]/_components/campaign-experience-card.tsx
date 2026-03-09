import { DEFAULT_REPORT_CONFIG, DEFAULT_RUNNER_CONFIG } from '@/utils/assessments/experience-config'
import {
  RUNNER_SECTION_ITEMS,
  type RunnerSectionKey,
  RunnerConfigForm,
  type RunnerOverrideConfig,
} from '@/components/dashboard/config-editor/runner-config-form'
import { ContextualPreview, type PreviewTabKey } from '@/components/dashboard/config-editor/contextual-preview'
import { SectionStepper } from '@/components/dashboard/config-editor/section-stepper'

function sectionToPreviewTab(section: RunnerSectionKey): PreviewTabKey {
  if (section === 'intro' || section === 'actions') return 'intro'
  if (section === 'completion') return 'completion'
  return 'question'
}

export function CampaignExperienceCard({
  runnerOverridesEnabled,
  activeOverrideSection,
  expandOverrideSections,
  overridePreviewTab,
  runnerOverrides,
  overrideErrors,
  overrideValidationFailed,
  previewRunner,
  overridesError,
  overridesSavedAt,
  overridesSaving,
  onRunnerOverridesEnabledChange,
  onActiveOverrideSectionChange,
  onExpandOverrideSectionsChange,
  onOverridePreviewTabChange,
  onRunnerOverridesChange,
  onSave,
}: {
  runnerOverridesEnabled: boolean
  activeOverrideSection: RunnerSectionKey
  expandOverrideSections: boolean
  overridePreviewTab: PreviewTabKey
  runnerOverrides: RunnerOverrideConfig
  overrideErrors: Partial<Record<keyof typeof DEFAULT_RUNNER_CONFIG, string>>
  overrideValidationFailed: boolean
  previewRunner: unknown
  overridesError: string | null
  overridesSavedAt: string | null
  overridesSaving: boolean
  onRunnerOverridesEnabledChange: (value: boolean) => void
  onActiveOverrideSectionChange: (section: RunnerSectionKey) => void
  onExpandOverrideSectionsChange: (value: boolean) => void
  onOverridePreviewTabChange: (tab: PreviewTabKey) => void
  onRunnerOverridesChange: (value: RunnerOverrideConfig) => void
  onSave: () => Promise<void>
}) {
  const overrideVisibleSections = expandOverrideSections
    ? RUNNER_SECTION_ITEMS.map((section) => section.id)
    : RUNNER_SECTION_ITEMS.filter((section) => section.id === activeOverrideSection).map((section) => section.id)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Experience overrides</p>
      <p className="mb-3 text-xs text-zinc-500">
        Review the default campaign experience, then override assessment runner copy only when needed.
      </p>
      <label className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        <input
          type="checkbox"
          checked={runnerOverridesEnabled}
          onChange={(event) => onRunnerOverridesEnabledChange(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        Enable campaign-specific assessment text overrides
      </label>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
            <p className="font-medium text-zinc-700 dark:text-zinc-200">Default campaign experience</p>
            <p className="mt-1">
              This preview shows the resolved campaign experience when overrides are off. Title uses the campaign
              name, intro is campaign-aware, and subtitle stays standardised.
            </p>
          </div>
          {runnerOverridesEnabled ? (
            <>
              <SectionStepperShell
                activeId={activeOverrideSection}
                expandAll={expandOverrideSections}
                onChange={(section) => {
                  const nextSection = section as RunnerSectionKey
                  onActiveOverrideSectionChange(nextSection)
                  onOverridePreviewTabChange(sectionToPreviewTab(nextSection))
                }}
                onToggleExpandAll={() => onExpandOverrideSectionsChange(!expandOverrideSections)}
              />
              <RunnerConfigForm
                mode="override"
                value={runnerOverrides}
                onChange={onRunnerOverridesChange}
                defaults={DEFAULT_RUNNER_CONFIG}
                errors={overrideErrors}
                visibleSections={overrideVisibleSections}
              />
            </>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Overrides are disabled. The campaign uses the default assessment experience shown in the preview.
            </p>
          )}
        </div>
        <ContextualPreview
          runnerConfig={previewRunner}
          reportConfig={DEFAULT_REPORT_CONFIG}
          title={runnerOverridesEnabled ? 'Resolved campaign experience' : 'Default campaign experience'}
          activeTab={overridePreviewTab}
          onTabChange={onOverridePreviewTabChange}
        />
      </div>
      {overridesError ? <p className="mt-2 text-sm text-red-600">{overridesError}</p> : null}
      {overridesSavedAt ? <p className="mt-2 text-xs text-emerald-600">Saved at {overridesSavedAt}</p> : null}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => {
            void onSave()
          }}
          disabled={overridesSaving || overrideValidationFailed}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {overridesSaving ? 'Saving...' : 'Save overrides'}
        </button>
      </div>
    </div>
  )
}

function SectionStepperShell({
  activeId,
  expandAll,
  onChange,
  onToggleExpandAll,
}: {
  activeId: RunnerSectionKey
  expandAll: boolean
  onChange: (section: string) => void
  onToggleExpandAll: () => void
}) {
  return (
    <SectionStepper
      items={RUNNER_SECTION_ITEMS}
      activeId={activeId}
      onChange={onChange}
      expandAll={expandAll}
      onToggleExpandAll={onToggleExpandAll}
    />
  )
}
