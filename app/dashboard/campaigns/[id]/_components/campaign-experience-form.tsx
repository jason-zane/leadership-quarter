'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useUnsavedChanges, useBeforeUnloadWarning } from '@/components/dashboard/hooks/use-unsaved-changes'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { AssessmentExperiencePreview as V2ExperiencePreview, type AssessmentExperiencePreviewTab as AssessmentV2PreviewTab } from '@/components/dashboard/assessments/experience-preview'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  normalizeReportConfig,
  normalizeRunnerConfig,
  type ReportConfig,
  type RunnerConfig,
} from '@/utils/assessments/experience-config'
import {
  DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG,
  getAssessmentV2ExperienceConfig,
  normalizeAssessmentV2ExperienceConfig,
  type AssessmentV2ExperienceBlock,
  type AssessmentV2ExperienceConfig,
  type AssessmentV2ExperienceEssentialItem,
  type AssessmentV2ExperienceExpectationItem,
} from '@/utils/assessments/v2-experience-config'

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

function blockLabel(type: AssessmentV2ExperienceBlock['type']) {
  if (type === 'essentials') return 'Essentials'
  if (type === 'expectation_flow') return 'What to expect'
  return 'Trust note'
}

function createDefaultBlock(type: AssessmentV2ExperienceBlock['type']): AssessmentV2ExperienceBlock {
  if (type === 'essentials') {
    return {
      id: createId('essentials'),
      type: 'essentials',
      title: 'Assessment essentials',
      items: [
        { id: createId('item'), kind: 'time', label: 'Time', value: '' },
        { id: createId('item'), kind: 'format', label: 'Format', value: 'One prompt at a time with a simple five-point scale.' },
        { id: createId('item'), kind: 'outcome', label: 'Outcome', value: 'A clear profile and practical next steps after completion.' },
      ],
    }
  }

  if (type === 'expectation_flow') {
    return {
      id: createId('expectation'),
      type: 'expectation_flow',
      title: 'What to expect',
      items: [
        {
          id: createId('expectation-item'),
          title: 'Answer from your current reality',
          body: 'Respond based on how things work today so the outcome is grounded and useful.',
        },
        {
          id: createId('expectation-item'),
          title: 'Keep momentum',
          body: 'The flow is designed to feel quick and focused with minimal friction between prompts.',
        },
      ],
    }
  }

  return {
    id: createId('trust'),
    type: 'trust_note',
    eyebrow: 'Before you begin',
    title: 'A focused, practical assessment',
    body: 'Set aside a few quiet minutes and answer directly. The strongest results come from consistent, honest responses.',
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
  const [experienceConfig, setExperienceConfig] = useState<AssessmentV2ExperienceConfig>(DEFAULT_ASSESSMENT_V2_EXPERIENCE_CONFIG)
  const [rawOverrides, setRawOverrides] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<AssessmentV2PreviewTab>('opening')
  const [activeEditorTab, setActiveEditorTab] = useState<ExperienceEditorTab>('opening_screen')

  const unsavedSnapshot = useMemo(
    () => ({ runnerConfig, reportConfig, experienceConfig }),
    [runnerConfig, reportConfig, experienceConfig]
  )
  const { isDirty, markSaved } = useUnsavedChanges(unsavedSnapshot, { warnOnUnload: false })
  useBeforeUnloadWarning(isDirty)

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
      setError(null)

      try {
        const response = await fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' })
        const body = (await response.json().catch(() => null)) as CampaignPayload | null
        if (!active) return

        if (!response.ok || !body?.campaign) {
          setError('Failed to load the campaign.')
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
        let seedExperienceConfig: AssessmentV2ExperienceConfig

        if (hasV2Experience) {
          // Campaign already has experience config — use it
          seedRunnerConfig = overrides
          seedExperienceConfig = normalizeAssessmentV2ExperienceConfig(overrides.v2_experience)
        } else if (primaryAssessment?.runner_config) {
          // Seed from assessment
          seedRunnerConfig = primaryAssessment.runner_config
          seedExperienceConfig = getAssessmentV2ExperienceConfig(primaryAssessment.runner_config)
        } else {
          seedExperienceConfig = normalizeAssessmentV2ExperienceConfig(null)
        }

        const normalizedRunner = normalizeRunnerConfig(seedRunnerConfig)
        const normalizedReport = normalizeReportConfig(primaryAssessment?.report_config)
        setRunnerConfig(normalizedRunner)
        setReportConfig(normalizedReport)
        setExperienceConfig(seedExperienceConfig)
        markSaved({ runnerConfig: normalizedRunner, reportConfig: normalizedReport, experienceConfig: seedExperienceConfig })
        setSavedAt(null)
      } catch {
        if (active) setError('Failed to load the campaign.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [campaignId, markSaved])

  async function save() {
    setSaving(true)
    setError(null)
    setSavedAt(null)

    try {
      // Build runner_overrides with v2_experience nested inside
      const v2Experience = normalizeAssessmentV2ExperienceConfig(experienceConfig)

      // Preserve any unknown keys in existing overrides
      const nextOverrides: Record<string, unknown> = { ...rawOverrides }
      // Apply runner config fields
      for (const [key, value] of Object.entries(runnerConfig)) {
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
        setError('Could not save the campaign experience.')
        return
      }

      // Refresh state from response
      if (body.campaign?.runner_overrides) {
        setRawOverrides(body.campaign.runner_overrides)
      }

      const normalizedRunner = normalizeRunnerConfig(nextOverrides)
      const normalizedExperience = normalizeAssessmentV2ExperienceConfig(v2Experience)
      setRunnerConfig(normalizedRunner)
      setExperienceConfig(normalizedExperience)
      markSaved({ runnerConfig: normalizedRunner, reportConfig, experienceConfig: normalizedExperience })
      setSavedAt(new Date().toLocaleTimeString())
    } catch {
      setError('Could not save the campaign experience.')
    } finally {
      setSaving(false)
    }
  }

  function updateBlock(blockId: string, updater: (block: AssessmentV2ExperienceBlock) => AssessmentV2ExperienceBlock) {
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

  function addBlock(type: AssessmentV2ExperienceBlock['type']) {
    setExperienceConfig((current) => ({
      ...current,
      openingBlocks: [...current.openingBlocks, createDefaultBlock(type)],
    }))
  }

  function renderEssentialItemEditor(blockId: string, item: AssessmentV2ExperienceEssentialItem, itemIndex: number) {
    return (
      <div key={item.id} className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-white/70 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.75fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_auto]">
          <Field label={`Item ${itemIndex + 1} label`}>
            <input
              value={item.label}
              onChange={(event) => updateBlock(blockId, (block) => {
                if (block.type !== 'essentials') return block
                const items = block.items.map((entry) => (
                  entry.id === item.id ? { ...entry, label: event.target.value } : entry
                ))
                return { ...block, items }
              })}
              className={inputClass()}
            />
          </Field>

          <Field label="Type">
            <select
              value={item.kind}
              onChange={(event) => updateBlock(blockId, (block) => {
                if (block.type !== 'essentials') return block
                const items = block.items.map((entry) => (
                  entry.id === item.id
                    ? { ...entry, kind: event.target.value as AssessmentV2ExperienceEssentialItem['kind'] }
                    : entry
                ))
                return { ...block, items }
              })}
              className={inputClass()}
            >
              <option value="time">Time</option>
              <option value="format">Format</option>
              <option value="outcome">Outcome</option>
              <option value="custom">Custom</option>
            </select>
          </Field>

          <Field label="Value">
            <input
              value={item.value}
              onChange={(event) => updateBlock(blockId, (block) => {
                if (block.type !== 'essentials') return block
                const items = block.items.map((entry) => (
                  entry.id === item.id ? { ...entry, value: event.target.value } : entry
                ))
                return { ...block, items }
              })}
              className={inputClass()}
              placeholder={item.kind === 'time' ? 'Uses estimated minutes automatically' : undefined}
            />
          </Field>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => updateBlock(blockId, (block) => {
                if (block.type !== 'essentials') return block
                return { ...block, items: block.items.filter((entry) => entry.id !== item.id) }
              })}
              className="rounded-full border border-[rgba(160,53,62,0.18)] px-3 py-2 text-xs font-semibold text-rose-700"
              disabled={itemIndex === 0 && item.kind === 'time'}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderExpectationItemEditor(blockId: string, item: AssessmentV2ExperienceExpectationItem, itemIndex: number) {
    return (
      <div key={item.id} className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-white/70 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Field label={`Step ${itemIndex + 1} title`}>
            <input
              value={item.title}
              onChange={(event) => updateBlock(blockId, (block) => {
                if (block.type !== 'expectation_flow') return block
                const items = block.items.map((entry) => (
                  entry.id === item.id ? { ...entry, title: event.target.value } : entry
                ))
                return { ...block, items }
              })}
              className={inputClass()}
            />
          </Field>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => updateBlock(blockId, (block) => {
                if (block.type !== 'expectation_flow') return block
                return { ...block, items: block.items.filter((entry) => entry.id !== item.id) }
              })}
              className="rounded-full border border-[rgba(160,53,62,0.18)] px-3 py-2 text-xs font-semibold text-rose-700"
            >
              Remove
            </button>
          </div>
        </div>

        <Field label="Body" helper="Keep each card concise. The preview is designed for short, decisive copy.">
          <textarea
            value={item.body}
            onChange={(event) => updateBlock(blockId, (block) => {
              if (block.type !== 'expectation_flow') return block
              const items = block.items.map((entry) => (
                entry.id === item.id ? { ...entry, body: event.target.value } : entry
              ))
              return { ...block, items }
            })}
            rows={3}
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
          <div className="flex flex-col items-end gap-2">
            <FoundationButton type="button" variant="primary" size="md" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving...' : 'Save experience'}
            </FoundationButton>
            {isDirty ? <p className="text-xs font-medium text-amber-700">Unsaved changes</p> : null}
            {!isDirty && savedAt ? <p className="text-xs text-emerald-700">Saved at {savedAt}</p> : null}
          </div>
        )}
      />

      {error ? (
        <FoundationSurface className="p-4">
          <p className="text-sm text-rose-700">{error}</p>
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
              <button type="button" onClick={() => addBlock('essentials')} className="rounded-full border border-[rgba(103,127,159,0.16)] bg-white px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)]">
                Add essentials
              </button>
              <button type="button" onClick={() => addBlock('expectation_flow')} className="rounded-full border border-[rgba(103,127,159,0.16)] bg-white px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)]">
                Add what to expect
              </button>
              <button type="button" onClick={() => addBlock('trust_note')} className="rounded-full border border-[rgba(103,127,159,0.16)] bg-white px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)]">
                Add trust note
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
                    {block.type === 'essentials' ? (
                      <>
                        <Field label="Section title">
                          <input
                            value={block.title}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'essentials' ? { ...currentBlock, title: event.target.value } : currentBlock)}
                            className={inputClass()}
                          />
                        </Field>
                        <div className="space-y-3">
                          {block.items.map((item, itemIndex) => renderEssentialItemEditor(block.id, item, itemIndex))}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateBlock(block.id, (currentBlock) => {
                            if (currentBlock.type !== 'essentials') return currentBlock
                            return {
                              ...currentBlock,
                              items: [
                                ...currentBlock.items,
                                { id: createId('item'), kind: 'custom', label: 'New item', value: 'Add supporting detail' },
                              ],
                            }
                          })}
                          className="rounded-full border border-[rgba(103,127,159,0.16)] px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)]"
                        >
                          Add item
                        </button>
                      </>
                    ) : null}

                    {block.type === 'expectation_flow' ? (
                      <>
                        <Field label="Section title">
                          <input
                            value={block.title}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'expectation_flow' ? { ...currentBlock, title: event.target.value } : currentBlock)}
                            className={inputClass()}
                          />
                        </Field>
                        <div className="space-y-3">
                          {block.items.map((item, itemIndex) => renderExpectationItemEditor(block.id, item, itemIndex))}
                        </div>
                        <button
                          type="button"
                          onClick={() => updateBlock(block.id, (currentBlock) => {
                            if (currentBlock.type !== 'expectation_flow') return currentBlock
                            return {
                              ...currentBlock,
                              items: [
                                ...currentBlock.items,
                                { id: createId('expectation-item'), title: 'New step', body: 'Add concise guidance for candidates here.' },
                              ],
                            }
                          })}
                          className="rounded-full border border-[rgba(103,127,159,0.16)] px-3 py-2 text-xs font-semibold text-[var(--admin-text-primary)]"
                        >
                          Add step
                        </button>
                      </>
                    ) : null}

                    {block.type === 'trust_note' ? (
                      <>
                        <Field label="Eyebrow">
                          <input
                            value={block.eyebrow}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'trust_note' ? { ...currentBlock, eyebrow: event.target.value } : currentBlock)}
                            className={inputClass()}
                          />
                        </Field>
                        <Field label="Title">
                          <input
                            value={block.title}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'trust_note' ? { ...currentBlock, title: event.target.value } : currentBlock)}
                            className={inputClass()}
                          />
                        </Field>
                        <Field label="Body">
                          <textarea
                            value={block.body}
                            onChange={(event) => updateBlock(block.id, (currentBlock) => currentBlock.type === 'trust_note' ? { ...currentBlock, body: event.target.value } : currentBlock)}
                            rows={3}
                            className={inputClass()}
                          />
                        </Field>
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

            <V2ExperiencePreview
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
