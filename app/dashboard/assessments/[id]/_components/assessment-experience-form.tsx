'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAutoSave } from '@/components/dashboard/hooks/use-auto-save'
import { AutoSaveStatus } from '@/components/dashboard/ui/auto-save-status'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { AssessmentExperiencePreview, type AssessmentExperiencePreviewTab } from '@/components/dashboard/assessments/experience-preview-core'
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
  withAssessmentExperienceConfig,
  type AssessmentExperienceBlock,
  type AssessmentExperienceConfig,
  type AssessmentExperienceSubCard,
} from '@/utils/assessments/assessment-experience-config'
import {
  buildBrandCssOverrides,
  normalizeOrgBrandingConfig,
  type OrgBrandingConfig,
} from '@/utils/brand/org-brand-utils'

type Props = {
  assessmentId: string
}

type LoadPayload = {
  ok?: boolean
  assessment?: {
    key: string
    external_name: string
    runner_config?: unknown
    report_config?: unknown
  }
}

type ExperienceEditorTab =
  | 'opening_screen'
  | 'opening_flow'
  | 'question_state'
  | 'finalising'
  | 'completion'
  | 'build_runtime'
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

export function AssessmentExperienceForm({ assessmentId }: Props) {
  const [assessmentKey, setAssessmentKey] = useState('')
  const [assessmentName, setAssessmentName] = useState('')
  const [rawRunnerConfig, setRawRunnerConfig] = useState<unknown>({})
  const [runnerConfig, setRunnerConfig] = useState<RunnerConfig>(normalizeRunnerConfig({}))
  const [reportConfig, setReportConfig] = useState<ReportConfig>(normalizeReportConfig({}))
  const [experienceConfig, setExperienceConfig] = useState<AssessmentExperienceConfig>(DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<AssessmentExperiencePreviewTab>('opening')
  const [activeEditorTab, setActiveEditorTab] = useState<ExperienceEditorTab>('opening_screen')
  const [previewBrandOptions, setPreviewBrandOptions] = useState<Array<{ id: string; name: string; brandingConfig: OrgBrandingConfig }>>([])
  const [selectedPreviewBrandId, setSelectedPreviewBrandId] = useState<string>('')
  const selectedPreviewBranding = useMemo(() => {
    if (!selectedPreviewBrandId) return null
    return previewBrandOptions.find((opt) => opt.id === selectedPreviewBrandId)?.brandingConfig ?? null
  }, [selectedPreviewBrandId, previewBrandOptions])
  const unsavedSnapshot = useMemo(
    () => ({ runnerConfig, reportConfig, experienceConfig }),
    [runnerConfig, reportConfig, experienceConfig]
  )

  const onSave = useCallback(async (data: { runnerConfig: RunnerConfig; reportConfig: ReportConfig; experienceConfig: AssessmentExperienceConfig }) => {
    const payloadRunnerConfig = withAssessmentExperienceConfig(
      rawRunnerConfig,
      data.runnerConfig,
      normalizeAssessmentExperienceConfig(data.experienceConfig)
    )

    const response = await fetch(`/api/admin/assessments/${assessmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runnerConfig: payloadRunnerConfig,
        reportConfig: data.reportConfig,
      }),
    })

    const body = (await response.json().catch(() => null)) as LoadPayload | null
    if (!response.ok || !body?.ok || !body.assessment) {
      throw new Error('Could not save the assessment experience.')
    }

    const normalizedRunnerConfig = normalizeRunnerConfig(body.assessment.runner_config)
    const normalizedReportConfig = normalizeReportConfig(body.assessment.report_config)
    const normalizedExperienceConfig = getAssessmentExperienceConfig(body.assessment.runner_config)
    setRawRunnerConfig(body.assessment.runner_config ?? payloadRunnerConfig)
    setRunnerConfig(normalizedRunnerConfig)
    setReportConfig(normalizedReportConfig)
    setExperienceConfig(normalizedExperienceConfig)
  }, [assessmentId, rawRunnerConfig])

  const { status, error, savedAt, saveNow, markSaved } = useAutoSave({
    data: unsavedSnapshot,
    onSave,
    saveOn: 'blur',
  })

  const editorTabs: Array<{ key: ExperienceEditorTab; label: string }> = [
    { key: 'opening_screen', label: 'Opening screen' },
    { key: 'opening_flow', label: 'Opening flow' },
    { key: 'question_state', label: 'Question state' },
    { key: 'finalising', label: 'Finalising' },
    { key: 'completion', label: 'Completion' },
    { key: 'build_runtime', label: 'Delivery' },
    { key: 'preview', label: 'Assessment view' },
  ]

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError(null)

      try {
        const response = await fetch(`/api/admin/assessments/${assessmentId}`, { cache: 'no-store' })
        const body = (await response.json().catch(() => null)) as LoadPayload | null
        if (!active) return

        if (!response.ok || !body?.ok || !body.assessment) {
          setLoadError('Failed to load the assessment experience.')
          return
        }

        setAssessmentKey(body.assessment.key)
        setAssessmentName(body.assessment.external_name)
        const normalizedRunnerConfig = normalizeRunnerConfig(body.assessment.runner_config)
        const normalizedReportConfig = normalizeReportConfig(body.assessment.report_config)
        const normalizedExperienceConfig = getAssessmentExperienceConfig(body.assessment.runner_config)
        setRawRunnerConfig(body.assessment.runner_config ?? {})
        setRunnerConfig(normalizedRunnerConfig)
        setReportConfig(normalizedReportConfig)
        setExperienceConfig(normalizedExperienceConfig)
        markSaved({
          runnerConfig: normalizedRunnerConfig,
          reportConfig: normalizedReportConfig,
          experienceConfig: normalizedExperienceConfig,
        })
        // Load campaigns that include this assessment for brand preview
        try {
          const campaignsRes = await fetch(`/api/admin/assessments/${assessmentId}/campaigns`, { cache: 'no-store' })
          const campaignsBody = (await campaignsRes.json().catch(() => null)) as {
            ok?: boolean
            campaigns?: Array<{
              id: string
              name: string
              organisations?: { branding_config?: unknown } | null
              branding_source_organisation?: { branding_config?: unknown } | null
            }>
          } | null
          if (active && campaignsBody?.campaigns) {
            const options = campaignsBody.campaigns
              .map((c) => {
                const rawConfig = c.branding_source_organisation?.branding_config ?? c.organisations?.branding_config
                if (!rawConfig) return null
                const config = normalizeOrgBrandingConfig(rawConfig)
                if (!config.branding_enabled) return null
                return { id: c.id, name: c.name, brandingConfig: config }
              })
              .filter((v): v is { id: string; name: string; brandingConfig: OrgBrandingConfig } => v !== null)
            setPreviewBrandOptions(options)
          }
        } catch {
          // Non-critical: brand preview options unavailable
        }
      } catch {
        if (active) setLoadError('Failed to load the assessment experience.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [assessmentId, markSaved])

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
    void saveNow()
  }

  function removeBlock(blockId: string) {
    setExperienceConfig((current) => ({
      ...current,
      openingBlocks: current.openingBlocks.filter((block) => block.id !== blockId),
    }))
    void saveNow()
  }

  function addBlock(type: 'card_grid_block' | 'feature_card') {
    const block = type === 'card_grid_block' ? createDefaultCardGridBlock() : createDefaultFeatureCardBlock()
    setExperienceConfig((current) => ({
      ...current,
      openingBlocks: [...current.openingBlocks, block],
    }))
    void saveNow()
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
              onBlur={() => void saveNow()}
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
              onBlur={() => void saveNow()}
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
              disabled={cardIndex === 0 && ((() => { const b = experienceConfig.openingBlocks.find(b => b.id === blockId); return b?.type === 'card_grid_block' && b.cards.length <= 1 })())}
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
            onBlur={() => void saveNow()}
            rows={2}
            className={inputClass()}
          />
        </Field>
      </div>
    )
  }

  if (loading) {
    return (
      <DashboardPageShell>
        <p className="text-sm text-[var(--admin-text-muted)]">Loading the assessment experience...</p>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title="Assessment experience"
        description="Design the candidate-facing opening flow, runtime states, and completion path."
        actions={(
          <div className="flex flex-col items-end gap-2">
            {assessmentKey ? (
              <a
                href={`/assess/p/${encodeURIComponent(assessmentKey)}`}
                className="foundation-btn foundation-btn-secondary foundation-btn-md"
                target="_blank"
                rel="noreferrer"
              >
                Open assessment
              </a>
            ) : null}
            <AutoSaveStatus status={status} error={error} savedAt={savedAt} onRetry={() => void saveNow()} />
          </div>
        )}
      />

      <FoundationSurface className="p-3">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Assessment experience sections">
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
                  onBlur={() => void saveNow()}
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
                  onBlur={() => void saveNow()}
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Title" helper="The layout is tuned to keep this on one line where practical.">
              <input
                value={runnerConfig.title}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, title: event.target.value }))}
                onBlur={() => void saveNow()}
                className={inputClass()}
              />
            </Field>

            <Field label="Intro body" helper="Use this to frame the assessment clearly before the modular sections take over.">
              <textarea
                value={runnerConfig.subtitle}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, subtitle: event.target.value }))}
                onBlur={() => void saveNow()}
                rows={3}
                className={inputClass()}
              />
            </Field>

            <Field label="Start button label">
              <input
                value={runnerConfig.start_cta_label}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, start_cta_label: event.target.value }))}
                onBlur={() => void saveNow()}
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
                              onBlur={() => void saveNow()}
                              className={inputClass()}
                            />
                          </Field>
                          <Field label="Title">
                            <input
                              value={block.title}
                              onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'card_grid_block' ? { ...currentBlock, title: event.target.value } : currentBlock)}
                              onBlur={() => void saveNow()}
                              className={inputClass()}
                            />
                          </Field>
                        </div>
                        <Field label="Description">
                          <textarea
                            value={block.description}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'card_grid_block' ? { ...currentBlock, description: event.target.value } : currentBlock)}
                            onBlur={() => void saveNow()}
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
                            onBlur={() => void saveNow()}
                            className={inputClass()}
                          />
                        </Field>
                        <Field label="Title">
                          <input
                            value={block.title}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, title: event.target.value } : currentBlock)}
                            onBlur={() => void saveNow()}
                            className={inputClass()}
                          />
                        </Field>
                        <Field label="Body">
                          <textarea
                            value={block.body}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, body: event.target.value } : currentBlock)}
                            onBlur={() => void saveNow()}
                            rows={3}
                            className={inputClass()}
                          />
                        </Field>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field label="CTA label" helper="Leave empty for no button.">
                            <input
                              value={block.cta_label}
                              onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, cta_label: event.target.value } : currentBlock)}
                              onBlur={() => void saveNow()}
                              className={inputClass()}
                            />
                          </Field>
                          <Field label="CTA link">
                            <input
                              value={block.cta_href}
                              onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'feature_card' ? { ...currentBlock, cta_href: event.target.value } : currentBlock)}
                              onBlur={() => void saveNow()}
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
                  onBlur={() => void saveNow()}
                  className={inputClass()}
                />
              </Field>
              <Field label="Title">
                <input
                  value={experienceConfig.questionIntroTitle}
                  onChange={(event) => setExperienceConfig((current) => ({ ...current, questionIntroTitle: event.target.value }))}
                  onBlur={() => void saveNow()}
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Body">
              <textarea
                value={experienceConfig.questionIntroBody}
                onChange={(event) => setExperienceConfig((current) => ({ ...current, questionIntroBody: event.target.value }))}
                onBlur={() => void saveNow()}
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
              description="Use a single animated status line after submit. The runtime no longer shows a duplicate disabled CTA here."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kicker">
                <input
                  value={experienceConfig.finalisingKicker}
                  onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingKicker: event.target.value }))}
                  onBlur={() => void saveNow()}
                  className={inputClass()}
                />
              </Field>
              <Field label="Status label">
                <input
                  value={experienceConfig.finalisingStatusLabel}
                  onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingStatusLabel: event.target.value }))}
                  onBlur={() => void saveNow()}
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Title">
              <input
                value={experienceConfig.finalisingTitle}
                onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingTitle: event.target.value }))}
                onBlur={() => void saveNow()}
                className={inputClass()}
              />
            </Field>

            <Field label="Body">
              <textarea
                value={experienceConfig.finalisingBody}
                onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingBody: event.target.value }))}
                onBlur={() => void saveNow()}
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

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Completion title">
                <input
                  value={runnerConfig.completion_screen_title}
                  onChange={(event) => setRunnerConfig((current) => ({ ...current, completion_screen_title: event.target.value }))}
                  onBlur={() => void saveNow()}
                  className={inputClass()}
                />
              </Field>

              <Field label="Completion CTA label">
                <input
                  value={runnerConfig.completion_screen_cta_label}
                  onChange={(event) => setRunnerConfig((current) => ({ ...current, completion_screen_cta_label: event.target.value }))}
                  onBlur={() => void saveNow()}
                  className={inputClass()}
                />
              </Field>
            </div>

            <Field label="Completion body">
              <textarea
                value={runnerConfig.completion_screen_body}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, completion_screen_body: event.target.value }))}
                onBlur={() => void saveNow()}
                rows={3}
                className={inputClass()}
              />
            </Field>

            <Field label="Completion CTA link">
              <input
                value={runnerConfig.completion_screen_cta_href}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, completion_screen_cta_href: event.target.value }))}
                onBlur={() => void saveNow()}
                className={inputClass()}
              />
            </Field>
          </FoundationSurface>
        ) : null}

        {activeEditorTab === 'build_runtime' ? (
          <FoundationSurface className="space-y-5 p-6">
            <SectionHeader
              eyebrow="Delivery"
              title="Route, completion, and support"
              description="Configure what completion does and how support details appear. The assessment route now uses the canonical runtime automatically."
            />

            <div className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-white/70 p-4">
              <p className="text-sm font-medium text-[var(--admin-text-primary)]">Assessment route</p>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                The public assessment route is always driven by the canonical runtime. Readiness is controlled by authored structure, published reports, and launch status.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-[rgba(103,127,159,0.12)] bg-white/70 p-4">
              <input
                type="checkbox"
                checked={runnerConfig.data_collection_only}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, data_collection_only: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-zinc-300"
              />
              <span>
                <span className="block text-sm font-medium text-[var(--admin-text-primary)]">Data collection only</span>
                <span className="block text-sm text-[var(--admin-text-muted)]">
                  Use the completion state instead of taking candidates into a report.
                </span>
              </span>
            </label>

            <Field label="Support contact email" helper="Displayed in the trust note when present.">
              <input
                value={runnerConfig.support_contact_email}
                onChange={(event) => setRunnerConfig((current) => ({ ...current, support_contact_email: event.target.value }))}
                onBlur={() => void saveNow()}
                className={inputClass()}
              />
            </Field>

            <div className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-white/70 p-4 text-sm text-[var(--admin-text-muted)]">
              Assessment URL: <code>/assess/p/{assessmentKey || 'assessment_key'}</code>
              {assessmentName ? <p className="mt-2">Assessment: {assessmentName}</p> : null}
              {loadError ? <p className="mt-2 text-rose-700">{loadError}</p> : null}
            </div>
          </FoundationSurface>
        ) : null}

        {activeEditorTab === 'preview' ? (
          <FoundationSurface className="space-y-5 p-6">
            <SectionHeader
              eyebrow="Assessment view"
              title="Full candidate view"
              description="Inspect each candidate-facing state at full width instead of relying on the side panel."
            />

            {previewBrandOptions.length > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--admin-text-primary)]">Preview as</span>
                <select
                  value={selectedPreviewBrandId}
                  onChange={(e) => setSelectedPreviewBrandId(e.target.value)}
                  className="foundation-field max-w-xs"
                >
                  <option value="">LQ Default</option>
                  {previewBrandOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </select>
              </div>
            ) : null}

            <AssessmentExperiencePreview
              runnerConfig={runnerConfig}
              reportConfig={reportConfig}
              experienceConfig={experienceConfig}
              activeTab={previewTab}
              onTabChange={setPreviewTab}
              fullWidth
              brandingConfig={selectedPreviewBranding}
            />
          </FoundationSurface>
        ) : null}
      </div>
    </DashboardPageShell>
  )
}
