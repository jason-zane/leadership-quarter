'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAutoSave } from '@/components/dashboard/hooks/use-auto-save'
import { AutoSaveStatus } from '@/components/dashboard/ui/auto-save-status'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { AssessmentExperiencePreview as AssessmentExperiencePreview, type AssessmentExperiencePreviewTab as AssessmentExperiencePreviewTab } from '@/components/dashboard/assessments/experience-preview'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  normalizeReportConfig,
  normalizeRunnerConfig,
  type ReportConfig,
  type RunnerConfig,
} from '@/utils/assessments/experience-config'
import {
  DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG,
  getAssessmentExperienceConfig,
  normalizeAssessmentExperienceConfig,
  type AssessmentExperienceBlock,
  type AssessmentExperienceConfig,
  type AssessmentExperienceSubCard,
} from '@/utils/assessments/assessment-experience-config'

type Props = {
  campaignId: string
}

type CampaignPayload = {
  ok?: boolean
  campaign?: {
    id: string
    name: string
    runner_overrides?: Record<string, unknown>
    config?: { report_access?: string }
    campaign_assessments?: Array<{
      is_active: boolean
      sort_order?: number
      assessments: {
        runner_config?: unknown
        report_config?: unknown
        external_name?: string
      } | null
    }>
  }
}

type ExperienceEditorTab =
  | 'opening_screen'
  | 'opening_flow'
  | 'question_state'
  | 'finalising'
  | 'completion'
  | 'preview'

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function inputClass() {
  return 'foundation-field w-full'
}

function helperCopy(text: string) {
  return <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{text}</p>
}

function Field({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--admin-text-primary)]">{label}</span>
      {children}
      {helper ? helperCopy(helper) : null}
    </label>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-text-soft)]">{eyebrow}</p>
      <h2 className="text-lg font-semibold text-[var(--admin-text-primary)]">{title}</h2>
      <p className="text-sm text-[var(--admin-text-muted)]">{description}</p>
    </div>
  )
}

function blockLabel(type: AssessmentExperienceBlock['type']) {
  if (type === 'card_grid_block') return 'Card grid'
  if (type === 'feature_card') return 'Feature card'
  if (type === 'essentials') return 'Essentials'
  if (type === 'expectation_flow') return 'What to expect'
  return 'Trust note'
}

function createDefaultCardGridBlock(): Extract<AssessmentExperienceBlock, { type: 'card_grid_block' }> {
  return {
    id: createId('card-grid'),
    type: 'card_grid_block',
    eyebrow: '',
    title: '',
    description: '',
    cards: [
      { id: createId('subcard'), eyebrow: '', title: '', body: '' },
      { id: createId('subcard'), eyebrow: '', title: '', body: '' },
    ],
  }
}

function createDefaultFeatureCardBlock(): Extract<AssessmentExperienceBlock, { type: 'feature_card' }> {
  return {
    id: createId('feature'),
    type: 'feature_card',
    eyebrow: '',
    title: '',
    body: '',
    cta_label: '',
    cta_href: '',
  }
}

function getCompletionDefaults(reportAccess: string | undefined) {
  if (reportAccess === 'immediate') {
    return {
      finalisingTitle: 'Generating your results',
      finalisingStatusLabel: 'Generating results',
      completionTitle: 'Your results are ready',
      completionBody: 'Your responses have been scored and your report is ready to view.',
    }
  }
  return {
    finalisingTitle: 'Finalising results',
    finalisingStatusLabel: 'Processing your responses',
    completionTitle: 'Assessment complete',
    completionBody: 'Thank you for completing this assessment. Your responses have been submitted successfully.',
  }
}

export function CampaignExperienceForm({ campaignId }: Props) {
  const [campaignName, setCampaignName] = useState('')
  const [reportAccess, setReportAccess] = useState<string | undefined>(undefined)
  const [runnerConfig, setRunnerConfig] = useState<RunnerConfig>(normalizeRunnerConfig({}))
  const [reportConfig, setReportConfig] = useState<ReportConfig>(normalizeReportConfig({}))
  const [experienceConfig, setExperienceConfig] = useState<AssessmentExperienceConfig>(DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG)
  const [rawOverrides, setRawOverrides] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<AssessmentExperiencePreviewTab>('opening')
  const [activeEditorTab, setActiveEditorTab] = useState<ExperienceEditorTab>('opening_screen')

  const unsavedSnapshot = useMemo(
    () => ({ runnerConfig, reportConfig, experienceConfig }),
    [runnerConfig, reportConfig, experienceConfig]
  )

  const onSave = useCallback(async (data: { runnerConfig: RunnerConfig; reportConfig: ReportConfig; experienceConfig: AssessmentExperienceConfig }) => {
    const v2Experience = normalizeAssessmentExperienceConfig(data.experienceConfig)
    const nextOverrides: Record<string, unknown> = { ...rawOverrides }
    for (const [key, value] of Object.entries(data.runnerConfig)) {
      nextOverrides[key] = value
    }
    nextOverrides.v2_experience = v2Experience

    const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runner_overrides: nextOverrides }),
    })

    const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; campaign?: CampaignPayload['campaign'] } | null
    if (!response.ok || !body?.ok) {
      throw new Error('Could not save the campaign experience.')
    }

    if (body.campaign?.runner_overrides) {
      setRawOverrides(body.campaign.runner_overrides)
    }

    const normalizedRunner = normalizeRunnerConfig(nextOverrides)
    const normalizedExperience = normalizeAssessmentExperienceConfig(v2Experience)
    setRunnerConfig(normalizedRunner)
    setExperienceConfig(normalizedExperience)
  }, [campaignId, rawOverrides])

  const { status, error, savedAt, saveNow, markSaved } = useAutoSave({
    data: unsavedSnapshot,
    onSave,
    debounceMs: 800,
  })

  const editorTabs: Array<{ key: ExperienceEditorTab; label: string }> = [
    { key: 'opening_screen', label: 'Opening screen' },
    { key: 'opening_flow', label: 'Opening flow' },
    { key: 'question_state', label: 'Question state' },
    { key: 'finalising', label: 'Finalising' },
    { key: 'completion', label: 'Completion' },
    { key: 'preview', label: 'Preview' },
  ]

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError(null)

      try {
        const response = await fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' })
        const body = (await response.json().catch(() => null)) as CampaignPayload | null
        if (!active) return

        if (!response.ok || !body?.campaign) {
          setLoadError('Failed to load the campaign.')
          return
        }

        const campaign = body.campaign
        setCampaignName(campaign.name)
        setReportAccess(campaign.config?.report_access)

        const overrides = campaign.runner_overrides ?? {}
        setRawOverrides(overrides)

        // Check if campaign already has v2_experience in runner_overrides
        const hasV2Experience = overrides.v2_experience && typeof overrides.v2_experience === 'object'

        // Find primary assessment's config as fallback
        const primaryAssessment = campaign.campaign_assessments
          ?.filter((a) => a.is_active && a.assessments)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]
          ?.assessments ?? null

        let seedRunnerConfig: unknown = {}
        let seedExperienceConfig: AssessmentExperienceConfig

        if (hasV2Experience) {
          // Campaign already has experience config — use it
          seedRunnerConfig = overrides
          seedExperienceConfig = normalizeAssessmentExperienceConfig(overrides.v2_experience)
        } else if (primaryAssessment?.runner_config) {
          // Seed from assessment
          seedRunnerConfig = primaryAssessment.runner_config
          seedExperienceConfig = getAssessmentExperienceConfig(primaryAssessment.runner_config)
        } else {
          seedExperienceConfig = normalizeAssessmentExperienceConfig(null)
        }

        const normalizedRunner = normalizeRunnerConfig(seedRunnerConfig)
        const normalizedReport = normalizeReportConfig(primaryAssessment?.report_config)
        setRunnerConfig(normalizedRunner)
        setReportConfig(normalizedReport)
        setExperienceConfig(seedExperienceConfig)
        markSaved({ runnerConfig: normalizedRunner, reportConfig: normalizedReport, experienceConfig: seedExperienceConfig })
      } catch {
        if (active) setLoadError('Failed to load the campaign.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [campaignId, markSaved])

  function updateBlock(blockId: string, updater: (block: AssessmentExperienceBlock) => AssessmentExperienceBlock) {
    setExperienceConfig((current) => ({
      ...current,
      openingBlocks: current.openingBlocks.map((block) => (block.id === blockId ? updater(block) : block)),
    }))
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setExperienceConfig((current) => {
      const index = current.openingBlocks.findIndex((block) => block.id === blockId)
      if (index < 0) return current
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.openingBlocks.length) return current
      const nextBlocks = [...current.openingBlocks]
      const [block] = nextBlocks.splice(index, 1)
      nextBlocks.splice(nextIndex, 0, block)
      return { ...current, openingBlocks: nextBlocks }
    })
  }

  function removeBlock(blockId: string) {
    setExperienceConfig((current) => ({
      ...current,
      openingBlocks: current.openingBlocks.filter((block) => block.id !== blockId),
    }))
  }

  function addBlock(type: 'card_grid_block' | 'feature_card') {
    const block = type === 'card_grid_block' ? createDefaultCardGridBlock() : createDefaultFeatureCardBlock()
    setExperienceConfig((current) => ({
      ...current,
      openingBlocks: [...current.openingBlocks, block],
    }))
  }

  function renderSubCardEditor(blockId: string, card: AssessmentExperienceSubCard, cardIndex: number) {
    return (
      <div key={card.id} className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-white/70 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)_auto]">
          <Field label="Eyebrow">
            <input
              value={card.eyebrow}
              onChange={(event) => updateBlock(blockId, (block) => {
                if (block.type !== 'card_grid_block') return block
                return { ...block, cards: block.cards.map((c) => c.id === card.id ? { ...c, eyebrow: event.target.value } : c) }
              })}
              className={inputClass()}
            />
          </Field>
          <Field label="Title">
            <input
              value={card.title}
              onChange={(event) => updateBlock(blockId, (block) => {
                if (block.type !== 'card_grid_block') return block
                return { ...block, cards: block.cards.map((c) => c.id === card.id ? { ...c, title: event.target.value } : c) }
              })}
              className={inputClass()}
            />
          </Field>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => updateBlock(blockId, (block) => {
                if (block.type !== 'card_grid_block') return block
                return { ...block, cards: block.cards.filter((c) => c.id !== card.id) }
              })}
              className="rounded-full border border-[rgba(160,53,62,0.18)] px-3 py-2 text-xs font-semibold text-rose-700"
              disabled={cardIndex === 0 && (block => { const b = experienceConfig.openingBlocks.find(b => b.id === blockId); return b?.type === 'card_grid_block' && b.cards.length <= 1 })()}
            >
              Remove
            </button>
          </div>
        </div>
        <Field label="Body" helper="Optional supporting text. Leave blank for a tighter card.">
          <textarea
            value={card.body}
            onChange={(event) => updateBlock(blockId, (block) => {
              if (block.type !== 'card_grid_block') return block
              return { ...block, cards: block.cards.map((c) => c.id === card.id ? { ...c, body: event.target.value } : c) }
            })}
            rows={2}
            className={inputClass()}
          />
        </Field>
      </div>
    )
  }

  const completionDefaults = getCompletionDefaults(reportAccess)

  if (loading) {
    return (
      <DashboardPageShell>
        <p className="text-sm text-[var(--admin-text-muted)]">Loading campaign experience...</p>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaign experience"
        title={campaignName || 'Experience editor'}
        description="Design the participant-facing opening flow, runtime states, and completion path for this campaign."
        actions={(
          <AutoSaveStatus status={status} error={error} savedAt={savedAt} onRetry={() => void saveNow()} />
        )}
      />

      {loadError ? (
        <FoundationSurface className="p-4">
          <p className="text-sm text-rose-700">{loadError}</p>
        </FoundationSurface>
      ) : null}

      <FoundationSurface className="p-3">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Campaign experience sections">
          {editorTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeEditorTab === tab.key}
              onClick={() => setActiveEditorTab(tab.key)}
              className={activeEditorTab === tab.key ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </FoundationSurface>

      <div className="space-y-6">
        {activeEditorTab === 'opening_screen' ? (
          <FoundationSurface className="space-y-5 p-6">
            <SectionHeader
              eyebrow="Opening screen"
              title="Hero and primary entry"
              description="Lead with a cleaner hero, stronger hierarchy, and a clear start action."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Intro line" helper="Small line above the title. Keep it short and clean.">
                <input
                  value={runnerConfig.intro}
                  onChange={(event) => setRunnerConfig((current) => ({ ...current, intro: event.target.value }))}
                  className={inputClass()}
                />
              </Field>

              <Field label="Estimated minutes" helper="Used in the hero and essentials block.">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={runnerConfig.estimated_minutes}
                  onChange={(event) => setRunnerConfig((current) => ({
                    ...current,
                    estimated_minutes: Math.max(1, Number(event.target.value) || 1),
                  }))}
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Title" helper="The layout is tuned to keep this on one line where practical.">
              <input
                value={runnerConfig.title}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, title: event.target.value }))}
                className={inputClass()}
              />
            </Field>

            <Field label="Intro body" helper="Use this to frame the assessment clearly before the modular sections take over.">
              <textarea
                value={runnerConfig.subtitle}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, subtitle: event.target.value }))}
                rows={3}
                className={inputClass()}
              />
            </Field>

            <Field label="Start button label">
              <input
                value={runnerConfig.start_cta_label}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, start_cta_label: event.target.value }))}
                className={inputClass()}
              />
            </Field>
          </FoundationSurface>
        ) : null}

        {activeEditorTab === 'opening_flow' ? (
          <FoundationSurface className="space-y-5 p-6">
            <SectionHeader
              eyebrow="Opening flow"
              title="Modular supporting sections"
              description="Build the screen beneath the hero with structured blocks. Reorder, refine, or remove blocks to tighten the candidate experience."
            />

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addBlock('card_grid_block')} className="rounded-full border border-[rgba(103,127,159,0.16)] bg-white px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)]">
                Add card grid
              </button>
              <button type="button" onClick={() => addBlock('feature_card')} className="rounded-full border border-[rgba(103,127,159,0.16)] bg-white px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)]">
                Add feature card
              </button>
            </div>

            <div className="space-y-4">
              {experienceConfig.openingBlocks.map((block, index) => (
                <div key={block.id} className="rounded-[1.4rem] border border-[rgba(99,122,150,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,252,0.95))] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-text-soft)]">Block {index + 1}</p>
                      <h3 className="mt-1 text-base font-semibold text-[var(--admin-text-primary)]">{blockLabel(block.type)}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={index === 0} className="rounded-full border border-[rgba(103,127,159,0.16)] px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)] disabled:opacity-50">
                        Move up
                      </button>
                      <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={index === experienceConfig.openingBlocks.length - 1} className="rounded-full border border-[rgba(103,127,159,0.16)] px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)] disabled:opacity-50">
                        Move down
                      </button>
                      <button type="button" onClick={() => removeBlock(block.id)} className="rounded-full border border-[rgba(160,53,62,0.18)] px-3 py-2 text-xs font-semibold text-rose-700">
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {block.type === 'card_grid_block' ? (
                      <>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="Eyebrow">
                            <input
                              value={block.eyebrow}
                              onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'card_grid_block' ? { ...currentBlock, eyebrow: event.target.value } : currentBlock)}
                              className={inputClass()}
                            />
                          </Field>
                          <Field label="Title">
                            <input
                              value={block.title}
                              onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'card_grid_block' ? { ...currentBlock, title: event.target.value } : currentBlock)}
                              className={inputClass()}
                            />
                          </Field>
                        </div>
                        <Field label="Description">
                          <textarea
                            value={block.description}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'card_grid_block' ? { ...currentBlock, description: event.target.value } : currentBlock)}
                            rows={2}
                            className={inputClass()}
                          />
                        </Field>
                        <div className="space-y-3">
                          {block.cards.map((card, cardIndex) => renderSubCardEditor(block.id, card, cardIndex))}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateBlock(block.id, (currentBlock) => {
                            if (currentBlock.type !== 'card_grid_block' || currentBlock.cards.length >= 3) return currentBlock
                            return { ...currentBlock, cards: [...currentBlock.cards, { id: createId('subcard'), eyebrow: '', title: '', body: '' }] }
                          })}
                          className="rounded-full border border-[rgba(103,127,159,0.16)] px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)]"
                          disabled={block.cards.length >= 3}
                        >
                          Add card
                        </button>
                      </>
                    ) : null}

                    {block.type === 'feature_card' ? (
                      <>
                        <Field label="Eyebrow">
                          <input
                            value={block.eyebrow}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, eyebrow: event.target.value } : currentBlock)}
                            className={inputClass()}
                          />
                        </Field>
                        <Field label="Title">
                          <input
                            value={block.title}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, title: event.target.value } : currentBlock)}
                            className={inputClass()}
                          />
                        </Field>
                        <Field label="Body">
                          <textarea
                            value={block.body}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, body: event.target.value } : currentBlock)}
                            rows={3}
                            className={inputClass()}
                          />
                        </Field>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="CTA label" helper="Leave empty for no button.">
                            <input
                              value={block.cta_label}
                              onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, cta_label: event.target.value } : currentBlock)}
                              className={inputClass()}
                            />
                          </Field>
                          <Field label="CTA link">
                            <input
                              value={block.cta_href}
                              onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, cta_href: event.target.value } : currentBlock)}
                              className={inputClass()}
                            />
                          </Field>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </FoundationSurface>
        ) : null}

        {activeEditorTab === 'question_state' ? (
          <FoundationSurface className="space-y-5 p-6">
            <SectionHeader
              eyebrow="Question state"
              title="Lead-in for the active assessment"
              description="These lines set tone once the candidate has already started."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Eyebrow">
                <input
                  value={experienceConfig.questionIntroEyebrow}
                  onChange={(event) => setExperienceConfig((current) => ({ ...current, questionIntroEyebrow: event.target.value }))}
                  className={inputClass()}
                />
              </Field>
              <Field label="Title">
                <input
                  value={experienceConfig.questionIntroTitle}
                  onChange={(event) => setExperienceConfig((current) => ({ ...current, questionIntroTitle: event.target.value }))}
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Body">
              <textarea
                value={experienceConfig.questionIntroBody}
                onChange={(event) => setExperienceConfig((current) => ({ ...current, questionIntroBody: event.target.value }))}
                rows={2}
                className={inputClass()}
              />
            </Field>
          </FoundationSurface>
        ) : null}

        {activeEditorTab === 'finalising' ? (
          <FoundationSurface className="space-y-5 p-6">
            <SectionHeader
              eyebrow="Finalising"
              title="Post-submit state"
              description="Use a single animated status line after submit."
            />

            <div className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-white/70 p-4 text-xs text-[var(--admin-text-muted)]">
              Report access is set to <strong>{reportAccess ?? 'unknown'}</strong>.
              Default wording adapts: {completionDefaults.finalisingTitle} / {completionDefaults.finalisingStatusLabel}.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kicker">
                <input
                  value={experienceConfig.finalisingKicker}
                  onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingKicker: event.target.value }))}
                  className={inputClass()}
                />
              </Field>
              <Field label="Status label">
                <input
                  value={experienceConfig.finalisingStatusLabel}
                  onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingStatusLabel: event.target.value }))}
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Title">
              <input
                value={experienceConfig.finalisingTitle}
                onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingTitle: event.target.value }))}
                className={inputClass()}
              />
            </Field>

            <Field label="Body">
              <textarea
                value={experienceConfig.finalisingBody}
                onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingBody: event.target.value }))}
                rows={3}
                className={inputClass()}
              />
            </Field>
          </FoundationSurface>
        ) : null}

        {activeEditorTab === 'completion' ? (
          <FoundationSurface className="space-y-5 p-6">
            <SectionHeader
              eyebrow="Completion"
              title="Finish state and next step"
              description="Keep the completion message direct and the CTA decisive."
            />

            <div className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-white/70 p-4 text-xs text-[var(--admin-text-muted)]">
              Report access is set to <strong>{reportAccess ?? 'unknown'}</strong>.
              Default wording: {completionDefaults.completionTitle} / {completionDefaults.completionBody.slice(0, 60)}...
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Completion title">
                <input
                  value={runnerConfig.completion_screen_title}
                  onChange={(event) => setRunnerConfig((current) => ({ ...current, completion_screen_title: event.target.value }))}
                  className={inputClass()}
                />
              </Field>

              <Field label="Completion CTA label">
                <input
                  value={runnerConfig.completion_screen_cta_label}
                  onChange={(event) => setRunnerConfig((current) => ({ ...current, completion_screen_cta_label: event.target.value }))}
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Completion body">
              <textarea
                value={runnerConfig.completion_screen_body}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, completion_screen_body: event.target.value }))}
                rows={3}
                className={inputClass()}
              />
            </Field>

            <Field label="Completion CTA link">
              <input
                value={runnerConfig.completion_screen_cta_href}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, completion_screen_cta_href: event.target.value }))}
                className={inputClass()}
              />
            </Field>
          </FoundationSurface>
        ) : null}

        {activeEditorTab === 'preview' ? (
          <FoundationSurface className="space-y-5 p-6">
            <SectionHeader
              eyebrow="Preview"
              title="Full candidate view"
              description="Inspect each candidate-facing state at full width."
            />

            <AssessmentExperiencePreview
              runnerConfig={runnerConfig}
              reportConfig={reportConfig}
              experienceConfig={experienceConfig}
              activeTab={previewTab}
              onTabChange={setPreviewTab}
              fullWidth
            />
          </FoundationSurface>
        ) : null}
      </div>
    </DashboardPageShell>
  )
}
