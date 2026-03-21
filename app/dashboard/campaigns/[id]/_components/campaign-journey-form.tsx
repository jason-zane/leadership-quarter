'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBeforeUnloadWarning, useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import {
  AssessmentCompletionPanel,
  AssessmentFinalisingPanel,
  AssessmentOpeningPanel,
  AssessmentPreviewAction,
} from '@/components/assess/assessment-experience-panels'
import { CampaignRegistrationStep } from '@/components/site/campaign-registration-step'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSelect, FoundationTextarea } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  normalizeCampaignJourneyScreenContentConfig,
  resolveCampaignJourney,
  type CampaignJourneyComposableScreenContent,
  type CampaignJourneyResolvedPage,
} from '@/utils/assessments/campaign-journey'
import type {
  CampaignConfig,
  CampaignFlowStep,
  CampaignScreenContentBlock,
  CampaignScreenSectionCard,
  CampaignScreenStepConfig,
} from '@/utils/assessments/campaign-types'
import { normalizeCampaignConfig } from '@/utils/assessments/campaign-types'
import { normalizeReportConfig, normalizeRunnerConfig, type ReportConfig, type RunnerConfig } from '@/utils/assessments/experience-config'
import {
  DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG,
  getAssessmentExperienceConfig,
  normalizeAssessmentExperienceConfig,
  type AssessmentExperienceBlock,
  type AssessmentExperienceConfig,
  type AssessmentExperienceEssentialItem,
  type AssessmentExperienceExpectationItem,
} from '@/utils/assessments/assessment-experience-config'
import type { ReactNode } from 'react'

type Props = {
  campaignId: string
}

type CampaignAssessmentRow = {
  id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  assessments: {
    id: string
    key: string
    name: string
    external_name?: string | null
    description?: string | null
    status: string
    runner_config?: unknown
    report_config?: unknown
  } | null
}

type CampaignPayload = {
  ok?: boolean
  campaign?: {
    id: string
    name: string
    external_name: string
    config?: CampaignConfig
    runner_overrides?: Record<string, unknown>
    campaign_assessments?: CampaignAssessmentRow[]
  }
  flowSteps?: CampaignFlowStep[]
}

type AssessmentOption = {
  id: string
  name: string
  key: string
  status: string
}

type JourneyTab = 'flow' | 'build' | 'preview'
type SystemContentKey = 'registration' | 'demographics' | 'completion'

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function inputClass() {
  return 'foundation-field w-full'
}

function emptyScreenDraft(): CampaignScreenStepConfig {
  return {
    eyebrow: '',
    title: 'Next step',
    body_markdown: 'Continue to the next page in this campaign journey.',
    cta_label: 'Continue',
    visual_style: 'standard',
    blocks: [],
  }
}

function createParagraphBlock(): CampaignScreenContentBlock {
  return {
    id: createId('block'),
    type: 'paragraph',
    eyebrow: '',
    title: 'Section title',
    body: 'Add supporting copy for this screen.',
  }
}

function createCardListBlock(): CampaignScreenContentBlock {
  return {
    id: createId('block'),
    type: 'card_list',
    eyebrow: '',
    title: 'Card section',
    cards: [
      { id: createId('card'), title: 'Card title', body: 'Add supporting guidance here.' },
      { id: createId('card'), title: 'Card title', body: 'Add supporting guidance here.' },
    ],
  }
}

function createDefaultExperienceBlock(type: AssessmentExperienceBlock['type']): AssessmentExperienceBlock {
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

function pageTypeLabel(type: CampaignJourneyResolvedPage['type']) {
  if (type === 'intro') return 'Intro'
  if (type === 'registration') return 'Registration'
  if (type === 'demographics') return 'Demographics'
  if (type === 'assessment') return 'Assessment'
  if (type === 'screen') return 'Custom screen'
  if (type === 'finalising') return 'Finalising'
  return 'Completion'
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

function blockLabel(type: AssessmentExperienceBlock['type']) {
  if (type === 'essentials') return 'Essentials'
  if (type === 'expectation_flow') return 'What to expect'
  return 'Trust note'
}

function deriveConfigFromPageOrder(config: CampaignConfig, pageOrder: string[]) {
  const nextConfig = { ...config }
  const firstAssessmentIndex = pageOrder.findIndex((pageId) => pageId.startsWith('assessment-'))
  const registrationIndex = pageOrder.indexOf('registration')
  const demographicsIndex = pageOrder.indexOf('demographics')

  if (registrationIndex >= 0 && config.registration_position !== 'none') {
    nextConfig.registration_position =
      firstAssessmentIndex >= 0 && registrationIndex > firstAssessmentIndex ? 'after' : 'before'
  }

  if (demographicsIndex >= 0 && config.demographics_enabled) {
    nextConfig.demographics_position =
      firstAssessmentIndex >= 0 && demographicsIndex > firstAssessmentIndex ? 'after' : 'before'
  }

  return nextConfig
}

function syncFlowStepsFromPageOrder(pageOrder: string[], flowSteps: CampaignFlowStep[]) {
  const flowIndex = new Map(
    flowSteps.map((step) => [step.step_type === 'screen' ? `screen-${step.id}` : `assessment-${step.id}`, step])
  )

  return pageOrder
    .filter((pageId) => flowIndex.has(pageId))
    .map((pageId, index) => {
      const step = flowIndex.get(pageId)!
      return { ...step, sort_order: index }
    })
}

function defaultSystemContent(key: SystemContentKey): CampaignJourneyComposableScreenContent {
  if (key === 'completion') {
    return {
      eyebrow: '',
      title: 'Assessment complete',
      body: 'Thank you for completing this assessment.',
      ctaLabel: 'Continue',
      ctaHref: '',
      blocks: [],
    }
  }

  return {
    eyebrow: '',
    title: key === 'registration' ? 'Registration' : 'Demographics',
    body: '',
    ctaLabel: 'Continue',
    blocks: [],
    ctaHref: '',
  }
}

function ScreenBlocksPreview({ blocks }: { blocks: CampaignScreenContentBlock[] }) {
  if (blocks.length === 0) return null

  return (
    <div className="mt-6 space-y-4">
      {blocks.map((block) => (
        <section key={block.id} className="rounded-[1.6rem] border border-[rgba(99,122,150,0.14)] bg-white p-5">
          {block.eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">
              {block.eyebrow}
            </p>
          ) : null}
          <h3 className="mt-2 text-lg font-semibold text-[var(--admin-text-primary)]">{block.title}</h3>
          {block.type === 'paragraph' ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--admin-text-muted)]">{block.body}</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {block.cards.map((card) => (
                <article key={card.id} className="rounded-2xl border border-[rgba(103,127,159,0.14)] bg-[rgba(246,248,251,0.9)] p-4">
                  <h4 className="text-sm font-semibold text-[var(--admin-text-primary)]">{card.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--admin-text-muted)]">{card.body}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

export function CampaignJourneyForm({ campaignId }: Props) {
  const [campaignName, setCampaignName] = useState('Campaign journey')
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>(normalizeCampaignConfig({}))
  const [runnerConfig, setRunnerConfig] = useState<RunnerConfig>(normalizeRunnerConfig({}))
  const [reportConfig, setReportConfig] = useState<ReportConfig>(normalizeReportConfig({}))
  const [experienceConfig, setExperienceConfig] = useState<AssessmentExperienceConfig>(DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG)
  const [systemScreenContent, setSystemScreenContent] = useState<Record<SystemContentKey, CampaignJourneyComposableScreenContent>>({
    registration: defaultSystemContent('registration'),
    demographics: defaultSystemContent('demographics'),
    completion: defaultSystemContent('completion'),
  })
  const [pageOrder, setPageOrder] = useState<string[]>([])
  const [rawOverrides, setRawOverrides] = useState<Record<string, unknown>>({})
  const [campaignAssessments, setCampaignAssessments] = useState<CampaignAssessmentRow[]>([])
  const [flowSteps, setFlowSteps] = useState<CampaignFlowStep[]>([])
  const [savedFlowStepIds, setSavedFlowStepIds] = useState<string[]>([])
  const [availableAssessments, setAvailableAssessments] = useState<AssessmentOption[]>([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [newScreenDraft, setNewScreenDraft] = useState<CampaignScreenStepConfig>(emptyScreenDraft())
  const [selectedPageId, setSelectedPageId] = useState<string>('intro')
  const [activeTab, setActiveTab] = useState<JourneyTab>('flow')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingAssessment, setAddingAssessment] = useState(false)
  const [addingScreen, setAddingScreen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const resolverOverrides = useMemo(
    () => ({
      ...rawOverrides,
      ...runnerConfig,
      v2_experience: experienceConfig,
      journey_screen_content: systemScreenContent,
      journey_page_order: pageOrder,
    }),
    [experienceConfig, pageOrder, rawOverrides, runnerConfig, systemScreenContent]
  )

  const draftSnapshot = useMemo(
    () => ({
      campaignConfig,
      runnerConfig,
      experienceConfig,
      systemScreenContent,
      pageOrder,
      flowStepIds: flowSteps.map((step) => `${step.id}:${step.sort_order}:${JSON.stringify(step.screen_config)}`),
    }),
    [campaignConfig, experienceConfig, flowSteps, pageOrder, runnerConfig, systemScreenContent]
  )
  const { isDirty, markSaved } = useUnsavedChanges(draftSnapshot, { warnOnUnload: false })
  useBeforeUnloadWarning(isDirty)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [campaignRes, assessmentsRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch('/api/admin/assessments', { cache: 'no-store' }),
    ])

    const campaignBody = (await campaignRes.json().catch(() => null)) as CampaignPayload | null
    const assessmentsBody = (await assessmentsRes.json().catch(() => null)) as
      | { assessments?: AssessmentOption[]; surveys?: AssessmentOption[] }
      | null

    if (!campaignRes.ok || !campaignBody?.campaign) {
      setError('Failed to load the campaign journey.')
      setLoading(false)
      return
    }

    const campaign = campaignBody.campaign
    const overrides = campaign.runner_overrides ?? {}
    const primaryAssessment = (campaign.campaign_assessments ?? [])
      .filter((assessment) => assessment.is_active && assessment.assessments)
      .sort((a, b) => a.sort_order - b.sort_order)[0]
    const nextRunner = normalizeRunnerConfig(
      Object.keys(overrides).length > 0 ? overrides : primaryAssessment?.assessments?.runner_config
    )
    const nextReport = normalizeReportConfig(primaryAssessment?.assessments?.report_config)
    const nextExperience = campaign.runner_overrides?.v2_experience
      ? normalizeAssessmentExperienceConfig(campaign.runner_overrides.v2_experience)
      : getAssessmentExperienceConfig(primaryAssessment?.assessments?.runner_config)
    const nextFlowSteps = campaignBody.flowSteps ?? []
    const normalizedConfig = normalizeCampaignConfig(campaign.config)
    const nextSystemContent = normalizeCampaignJourneyScreenContentConfig(
      overrides.journey_screen_content,
      overrides.journey_screen_copy
    )
    const resolved = resolveCampaignJourney({
      campaignName: campaign.name,
      campaignConfig: normalizedConfig,
      runnerOverrides: {
        ...overrides,
        ...nextRunner,
        v2_experience: nextExperience,
        journey_screen_content: nextSystemContent,
      },
      assessmentReportConfig: nextReport,
      flowSteps: nextFlowSteps,
      campaignAssessments: (campaign.campaign_assessments ?? []).map((assessment) => ({
        id: assessment.id,
        campaign_assessment_id: assessment.id,
        sort_order: assessment.sort_order,
        is_active: assessment.is_active,
        assessments: assessment.assessments
          ? {
              id: assessment.assessments.id,
              name: assessment.assessments.name,
              externalName: assessment.assessments.external_name ?? null,
              description: assessment.assessments.description ?? null,
              status: assessment.assessments.status,
            }
          : null,
      })),
    })
    const attachedAssessmentIds = new Set((campaign.campaign_assessments ?? []).map((item) => item.assessment_id))
    const available = (assessmentsBody?.assessments ?? assessmentsBody?.surveys ?? [])
      .filter((assessment) => assessment.status === 'active' && !attachedAssessmentIds.has(assessment.id))

    setCampaignName(campaign.name)
    setCampaignConfig(normalizedConfig)
    setRunnerConfig(nextRunner)
    setReportConfig(nextReport)
    setExperienceConfig(nextExperience)
    setSystemScreenContent({
      registration: nextSystemContent.registration ?? defaultSystemContent('registration'),
      demographics: nextSystemContent.demographics ?? defaultSystemContent('demographics'),
      completion: nextSystemContent.completion ?? defaultSystemContent('completion'),
    })
    setPageOrder(resolved.pageOrder)
    setRawOverrides(overrides)
    setCampaignAssessments(campaign.campaign_assessments ?? [])
    setFlowSteps(nextFlowSteps)
    setSavedFlowStepIds(nextFlowSteps.map((step) => step.id))
    setAvailableAssessments(available)
    setSelectedPageId(resolved.pageOrder[0] ?? 'intro')
    markSaved({
      campaignConfig: normalizedConfig,
      runnerConfig: nextRunner,
      experienceConfig: nextExperience,
      systemScreenContent: {
        registration: nextSystemContent.registration ?? defaultSystemContent('registration'),
        demographics: nextSystemContent.demographics ?? defaultSystemContent('demographics'),
        completion: nextSystemContent.completion ?? defaultSystemContent('completion'),
      },
      pageOrder: resolved.pageOrder,
      flowStepIds: nextFlowSteps.map((step) => `${step.id}:${step.sort_order}:${JSON.stringify(step.screen_config)}`),
    })
    setSavedAt(null)
    setLoading(false)
  }, [campaignId, markSaved])

  useEffect(() => {
    void load()
  }, [load])

  const resolvedJourney = useMemo(
    () =>
      resolveCampaignJourney({
        campaignName,
        campaignConfig,
        runnerOverrides: resolverOverrides,
        assessmentReportConfig: reportConfig,
        flowSteps,
        campaignAssessments: campaignAssessments.map((assessment) => ({
          id: assessment.id,
          campaign_assessment_id: assessment.id,
          sort_order: assessment.sort_order,
          is_active: assessment.is_active,
          assessments: assessment.assessments
            ? {
                id: assessment.assessments.id,
                name: assessment.assessments.name,
                externalName: assessment.assessments.external_name ?? null,
                description: assessment.assessments.description ?? null,
                status: assessment.assessments.status,
              }
            : null,
        })),
      }),
    [campaignAssessments, campaignConfig, campaignName, flowSteps, reportConfig, resolverOverrides]
  )

  useEffect(() => {
    if (!resolvedJourney.pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(resolvedJourney.pages[0]?.id ?? 'intro')
    }
  }, [resolvedJourney.pages, selectedPageId])

  const selectedPage = resolvedJourney.pages.find((page) => page.id === selectedPageId) ?? resolvedJourney.pages[0] ?? null

  function updateSystemContent(
    key: SystemContentKey,
    patch: Partial<CampaignJourneyComposableScreenContent>
  ) {
    setSystemScreenContent((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }))
  }

  function updateSystemBlocks(key: SystemContentKey, blocks: CampaignScreenContentBlock[]) {
    setSystemScreenContent((current) => ({
      ...current,
      [key]: {
        ...current[key],
        blocks,
      },
    }))
  }

  function updateScreenConfig(stepId: string, patch: Partial<CampaignScreenStepConfig>) {
    setFlowSteps((current) =>
      current.map((step) =>
        step.id === stepId
          ? { ...step, screen_config: { ...step.screen_config, ...patch } }
          : step
      )
    )
  }

  function movePage(pageId: string, direction: 'up' | 'down') {
    const currentIndex = pageOrder.indexOf(pageId)
    if (currentIndex < 0) return

    const page = resolvedJourney.pages.find((entry) => entry.id === pageId)
    if (!page || page.movement === 'fixed') {
      setError('This screen is fixed in the journey.')
      return
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= pageOrder.length) {
      return
    }

    const targetPage = resolvedJourney.pages.find((entry) => entry.id === pageOrder[targetIndex])
    if (targetPage?.movement === 'fixed') {
      setError('This screen cannot move past the end-of-journey states.')
      return
    }

    const nextPageOrder = moveItem(pageOrder, currentIndex, targetIndex)
    setError(null)
    setPageOrder(nextPageOrder)
    setFlowSteps(syncFlowStepsFromPageOrder(nextPageOrder, flowSteps))
  }

  async function addAssessmentStep() {
    if (!selectedAssessmentId) return
    setAddingAssessment(true)
    setError(null)

    const response = await fetch(`/api/admin/campaigns/${campaignId}/flow/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step_type: 'assessment', assessment_id: selectedAssessmentId }),
    })

    setAddingAssessment(false)
    if (!response.ok) {
      setError('Could not add that assessment step.')
      return
    }

    setSelectedAssessmentId('')
    await load()
  }

  async function addScreenStep() {
    setAddingScreen(true)
    setError(null)

    const response = await fetch(`/api/admin/campaigns/${campaignId}/flow/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step_type: 'screen', screen_config: newScreenDraft }),
    })

    setAddingScreen(false)
    if (!response.ok) {
      setError('Could not add that screen.')
      return
    }

    setNewScreenDraft(emptyScreenDraft())
    await load()
  }

  async function deleteScreenStep(stepId: string) {
    const response = await fetch(`/api/admin/campaigns/${campaignId}/flow/steps/${stepId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      setError('Could not remove that screen.')
      return
    }

    await load()
  }

  async function persistFlowOrder() {
    let current = [...savedFlowStepIds]
    const desired = flowSteps.map((step) => step.id)

    for (let desiredIndex = 0; desiredIndex < desired.length; desiredIndex += 1) {
      const desiredId = desired[desiredIndex]
      let currentIndex = current.indexOf(desiredId)

      while (currentIndex > desiredIndex) {
        const response = await fetch(`/api/admin/campaigns/${campaignId}/flow/steps/${desiredId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ direction: 'up' }),
        })
        if (!response.ok) {
          throw new Error('Could not save flow order.')
        }
        current = moveItem(current, currentIndex, currentIndex - 1)
        currentIndex -= 1
      }
    }

    setSavedFlowStepIds(desired)
  }

  async function persistScreenConfigs() {
    const screenSteps = flowSteps.filter((step) => step.step_type === 'screen')
    await Promise.all(
      screenSteps.map(async (step) => {
        const response = await fetch(`/api/admin/campaigns/${campaignId}/flow/steps/${step.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            screen_config: step.screen_config,
          }),
        })

        if (!response.ok) {
          throw new Error('Could not save a custom screen.')
        }
      })
    )
  }

  async function saveJourney() {
    setSaving(true)
    setError(null)
    setSavedAt(null)

    try {
      const nextPageOrder = resolvedJourney.pages.map((page) => page.id)
      const nextConfig = deriveConfigFromPageOrder(campaignConfig, nextPageOrder)
      const nextOverrides: Record<string, unknown> = { ...rawOverrides }
      for (const [key, value] of Object.entries(runnerConfig)) {
        nextOverrides[key] = value
      }
      nextOverrides.v2_experience = normalizeAssessmentExperienceConfig(experienceConfig)
      nextOverrides.journey_screen_content = systemScreenContent
      nextOverrides.journey_page_order = nextPageOrder

      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: nextConfig,
          runner_overrides: nextOverrides,
        }),
      })
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; campaign?: { runner_overrides?: Record<string, unknown>; config?: CampaignConfig } }
        | null

      if (!response.ok || !body?.ok) {
        setError('Could not save the journey.')
        setSaving(false)
        return
      }

      await persistFlowOrder()
      await persistScreenConfigs()

      const normalizedConfig = normalizeCampaignConfig(body.campaign?.config ?? nextConfig)
      const normalizedOverrides = body.campaign?.runner_overrides ?? nextOverrides
      setCampaignConfig(normalizedConfig)
      setPageOrder(nextPageOrder)
      setRawOverrides(normalizedOverrides)
      markSaved({
        campaignConfig: normalizedConfig,
        runnerConfig,
        experienceConfig,
        systemScreenContent,
        pageOrder: nextPageOrder,
        flowStepIds: flowSteps.map((step) => `${step.id}:${step.sort_order}:${JSON.stringify(step.screen_config)}`),
      })
      setSavedAt(new Date().toLocaleTimeString())
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the journey.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading journey…</p>
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title="Journey"
        description={`Build the exact sequence of screens candidates see in ${campaignName}, and edit the content on each one.`}
        actions={(
          <FoundationButton type="button" onClick={() => void saveJourney()} disabled={saving}>
            {saving ? 'Saving…' : 'Save journey'}
          </FoundationButton>
        )}
      />

      <div className="backend-tab-bar">
        {[
          { key: 'flow', label: 'Flow' },
          { key: 'build', label: 'Build' },
          { key: 'preview', label: 'Preview' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as JourneyTab)}
            className={['backend-tab-link', activeTab === tab.key ? 'backend-tab-link-active' : ''].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-[var(--admin-text-muted)]">
          Journey controls screen order and candidate-facing copy. Settings still controls enablement and campaign rules.
        </p>
        <div className="text-right">
          {isDirty ? <p className="text-xs font-medium text-amber-700">Unsaved changes</p> : null}
          {!isDirty && savedAt ? <p className="text-xs text-emerald-600">Saved at {savedAt}</p> : null}
        </div>
      </div>

      {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      {activeTab === 'flow' ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.9fr)]">
          <FoundationSurface className="space-y-4 p-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Candidate screen order</h2>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                Reorder the real screens candidates see. Select any row to open it in Build.
              </p>
            </div>

            <div className="space-y-3">
              {resolvedJourney.pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => {
                    setSelectedPageId(page.id)
                    setActiveTab('build')
                  }}
                  className={[
                    'w-full rounded-[1.4rem] border p-4 text-left transition',
                    selectedPageId === page.id
                      ? 'border-[rgba(26,111,223,0.35)] bg-[rgba(26,111,223,0.06)]'
                      : 'border-[rgba(99,122,150,0.14)] bg-white hover:border-[rgba(99,122,150,0.25)]',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">
                        {String(index + 1).padStart(2, '0')} · {pageTypeLabel(page.type)}
                      </p>
                      <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">{page.title}</h3>
                      <p className="line-clamp-2 text-sm text-[var(--admin-text-muted)]">{page.description || 'No supporting copy yet.'}</p>
                    </div>
                    <div className="flex gap-2">
                      <FoundationButton type="button" variant="secondary" size="sm" onClick={(event) => {
                        event.stopPropagation()
                        movePage(page.id, 'up')
                      }} disabled={page.movement === 'fixed' || index === 0}>
                        Up
                      </FoundationButton>
                      <FoundationButton type="button" variant="secondary" size="sm" onClick={(event) => {
                        event.stopPropagation()
                        movePage(page.id, 'down')
                      }} disabled={page.movement === 'fixed' || index === resolvedJourney.pages.length - 1}>
                        Down
                      </FoundationButton>
                      {page.type === 'screen' && page.flowStep ? (
                        <FoundationButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            void deleteScreenStep(page.flowStep!.id)
                          }}
                        >
                          Remove
                        </FoundationButton>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </FoundationSurface>

          <div className="space-y-6">
            <FoundationSurface className="space-y-4 p-6">
              <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Add assessment</h3>
              <FoundationSelect value={selectedAssessmentId} onChange={(event) => setSelectedAssessmentId(event.target.value)}>
                <option value="">Select an assessment…</option>
                {availableAssessments.map((assessment) => (
                  <option key={assessment.id} value={assessment.id}>{assessment.name}</option>
                ))}
              </FoundationSelect>
              <FoundationButton type="button" onClick={() => void addAssessmentStep()} disabled={!selectedAssessmentId || addingAssessment}>
                {addingAssessment ? 'Adding…' : 'Add assessment'}
              </FoundationButton>
            </FoundationSurface>

            <FoundationSurface className="space-y-4 p-6">
              <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Add custom screen</h3>
              <input
                value={newScreenDraft.eyebrow}
                onChange={(event) => setNewScreenDraft((current) => ({ ...current, eyebrow: event.target.value }))}
                className={inputClass()}
                placeholder="Eyebrow"
              />
              <input
                value={newScreenDraft.title}
                onChange={(event) => setNewScreenDraft((current) => ({ ...current, title: event.target.value }))}
                className={inputClass()}
                placeholder="Screen title"
              />
              <FoundationTextarea
                value={newScreenDraft.body_markdown}
                onChange={(event) => setNewScreenDraft((current) => ({ ...current, body_markdown: event.target.value }))}
                rows={4}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={newScreenDraft.cta_label}
                  onChange={(event) => setNewScreenDraft((current) => ({ ...current, cta_label: event.target.value }))}
                  className={inputClass()}
                  placeholder="CTA label"
                />
                <FoundationSelect
                  value={newScreenDraft.visual_style}
                  onChange={(event) => setNewScreenDraft((current) => ({
                    ...current,
                    visual_style: event.target.value === 'transition' ? 'transition' : 'standard',
                  }))}
                >
                  <option value="standard">Standard</option>
                  <option value="transition">Transition</option>
                </FoundationSelect>
              </div>
              <FoundationButton type="button" onClick={() => void addScreenStep()} disabled={addingScreen}>
                {addingScreen ? 'Adding…' : 'Add screen'}
              </FoundationButton>
            </FoundationSurface>
          </div>
        </div>
      ) : null}

      {activeTab === 'build' ? (
        <div className="mt-6 space-y-6">
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {resolvedJourney.pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedPageId(page.id)}
                  className={[
                    'rounded-full border px-4 py-2 text-sm font-medium',
                    selectedPageId === page.id
                      ? 'border-[rgba(26,111,223,0.3)] bg-[rgba(26,111,223,0.08)] text-[var(--admin-text-primary)]'
                      : 'border-[rgba(103,127,159,0.16)] bg-white text-[var(--admin-text-muted)]',
                  ].join(' ')}
                >
                  {pageTypeLabel(page.type)}
                </button>
              ))}
            </div>
          </div>

          {selectedPage ? (
            <FoundationSurface className="space-y-6 p-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-text-soft)]">
                  {pageTypeLabel(selectedPage.type)}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--admin-text-primary)]">{selectedPage.title}</h2>
              </div>

              {selectedPage.type === 'intro' ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-[var(--admin-text-primary)]">Eyebrow</span>
                      <input
                        value={runnerConfig.intro}
                        onChange={(event) => setRunnerConfig((current) => ({ ...current, intro: event.target.value }))}
                        className={inputClass()}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-[var(--admin-text-primary)]">CTA label</span>
                      <input
                        value={runnerConfig.start_cta_label}
                        onChange={(event) => setRunnerConfig((current) => ({ ...current, start_cta_label: event.target.value }))}
                        className={inputClass()}
                      />
                    </label>
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">Title</span>
                    <input
                      value={runnerConfig.title}
                      onChange={(event) => setRunnerConfig((current) => ({ ...current, title: event.target.value }))}
                      className={inputClass()}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">Body</span>
                    <FoundationTextarea
                      value={runnerConfig.subtitle}
                      onChange={(event) => setRunnerConfig((current) => ({ ...current, subtitle: event.target.value }))}
                      rows={3}
                    />
                  </label>

                  <div className="rounded-[1.4rem] border border-[rgba(99,122,150,0.14)] bg-[rgba(246,248,251,0.75)] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Opening sections</h3>
                        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                          Build the cards and sections shown underneath the intro hero.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                          ...current,
                          openingBlocks: [...current.openingBlocks, createDefaultExperienceBlock('essentials')],
                        }))}>
                          Add essentials
                        </FoundationButton>
                        <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                          ...current,
                          openingBlocks: [...current.openingBlocks, createDefaultExperienceBlock('expectation_flow')],
                        }))}>
                          Add what to expect
                        </FoundationButton>
                        <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                          ...current,
                          openingBlocks: [...current.openingBlocks, createDefaultExperienceBlock('trust_note')],
                        }))}>
                          Add trust note
                        </FoundationButton>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {experienceConfig.openingBlocks.map((block, index) => (
                        <div key={block.id} className="rounded-[1.25rem] border border-[rgba(99,122,150,0.14)] bg-white p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">
                                Block {index + 1}
                              </p>
                              <h4 className="mt-1 text-base font-semibold text-[var(--admin-text-primary)]">{blockLabel(block.type)}</h4>
                            </div>
                            <div className="flex gap-2">
                              <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                                ...current,
                                openingBlocks: moveItem(current.openingBlocks, index, index - 1),
                              }))} disabled={index === 0}>
                                Up
                              </FoundationButton>
                              <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                                ...current,
                                openingBlocks: moveItem(current.openingBlocks, index, index + 1),
                              }))} disabled={index === experienceConfig.openingBlocks.length - 1}>
                                Down
                              </FoundationButton>
                              <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                                ...current,
                                openingBlocks: current.openingBlocks.filter((entry) => entry.id !== block.id),
                              }))}>
                                Remove
                              </FoundationButton>
                            </div>
                          </div>

                          <div className="mt-4 space-y-4">
                            {block.type === 'essentials' ? (
                              <>
                                <input
                                  value={block.title}
                                  onChange={(event) => setExperienceConfig((current) => ({
                                    ...current,
                                    openingBlocks: current.openingBlocks.map((entry) => (
                                      entry.id === block.id && entry.type === 'essentials'
                                        ? { ...entry, title: event.target.value }
                                        : entry
                                    )),
                                  }))}
                                  className={inputClass()}
                                />
                                <div className="space-y-3">
                                  {block.items.map((item: AssessmentExperienceEssentialItem, itemIndex) => (
                                    <div key={item.id} className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-[rgba(246,248,251,0.65)] p-4">
                                      <div className="grid gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1.5fr)_auto]">
                                        <input
                                          value={item.label}
                                          onChange={(event) => setExperienceConfig((current) => ({
                                            ...current,
                                            openingBlocks: current.openingBlocks.map((entry) => {
                                              if (entry.id !== block.id || entry.type !== 'essentials') return entry
                                              return {
                                                ...entry,
                                                items: entry.items.map((candidate) => candidate.id === item.id ? { ...candidate, label: event.target.value } : candidate),
                                              }
                                            }),
                                          }))}
                                          className={inputClass()}
                                        />
                                        <FoundationSelect
                                          value={item.kind}
                                          onChange={(event) => setExperienceConfig((current) => ({
                                            ...current,
                                            openingBlocks: current.openingBlocks.map((entry) => {
                                              if (entry.id !== block.id || entry.type !== 'essentials') return entry
                                              return {
                                                ...entry,
                                                items: entry.items.map((candidate) => candidate.id === item.id ? { ...candidate, kind: event.target.value as AssessmentExperienceEssentialItem['kind'] } : candidate),
                                              }
                                            }),
                                          }))}
                                        >
                                          <option value="time">Time</option>
                                          <option value="format">Format</option>
                                          <option value="outcome">Outcome</option>
                                          <option value="custom">Custom</option>
                                        </FoundationSelect>
                                        <input
                                          value={item.value}
                                          onChange={(event) => setExperienceConfig((current) => ({
                                            ...current,
                                            openingBlocks: current.openingBlocks.map((entry) => {
                                              if (entry.id !== block.id || entry.type !== 'essentials') return entry
                                              return {
                                                ...entry,
                                                items: entry.items.map((candidate) => candidate.id === item.id ? { ...candidate, value: event.target.value } : candidate),
                                              }
                                            }),
                                          }))}
                                          className={inputClass()}
                                        />
                                        <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                                          ...current,
                                          openingBlocks: current.openingBlocks.map((entry) => {
                                            if (entry.id !== block.id || entry.type !== 'essentials') return entry
                                            return { ...entry, items: entry.items.filter((candidate) => candidate.id !== item.id) }
                                          }),
                                        }))} disabled={itemIndex === 0 && item.kind === 'time'}>
                                          Remove
                                        </FoundationButton>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                                  ...current,
                                  openingBlocks: current.openingBlocks.map((entry) => {
                                    if (entry.id !== block.id || entry.type !== 'essentials') return entry
                                    return {
                                      ...entry,
                                      items: [...entry.items, { id: createId('item'), kind: 'custom', label: 'New item', value: 'Add supporting detail' }],
                                    }
                                  }),
                                }))}>
                                  Add item
                                </FoundationButton>
                              </>
                            ) : null}

                            {block.type === 'expectation_flow' ? (
                              <>
                                <input
                                  value={block.title}
                                  onChange={(event) => setExperienceConfig((current) => ({
                                    ...current,
                                    openingBlocks: current.openingBlocks.map((entry) => (
                                      entry.id === block.id && entry.type === 'expectation_flow'
                                        ? { ...entry, title: event.target.value }
                                        : entry
                                    )),
                                  }))}
                                  className={inputClass()}
                                />
                                <div className="space-y-3">
                                  {block.items.map((item: AssessmentExperienceExpectationItem) => (
                                    <div key={item.id} className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-[rgba(246,248,251,0.65)] p-4">
                                      <div className="space-y-3">
                                        <input
                                          value={item.title}
                                          onChange={(event) => setExperienceConfig((current) => ({
                                            ...current,
                                            openingBlocks: current.openingBlocks.map((entry) => {
                                              if (entry.id !== block.id || entry.type !== 'expectation_flow') return entry
                                              return {
                                                ...entry,
                                                items: entry.items.map((candidate) => candidate.id === item.id ? { ...candidate, title: event.target.value } : candidate),
                                              }
                                            }),
                                          }))}
                                          className={inputClass()}
                                        />
                                        <FoundationTextarea
                                          value={item.body}
                                          onChange={(event) => setExperienceConfig((current) => ({
                                            ...current,
                                            openingBlocks: current.openingBlocks.map((entry) => {
                                              if (entry.id !== block.id || entry.type !== 'expectation_flow') return entry
                                              return {
                                                ...entry,
                                                items: entry.items.map((candidate) => candidate.id === item.id ? { ...candidate, body: event.target.value } : candidate),
                                              }
                                            }),
                                          }))}
                                          rows={3}
                                        />
                                        <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                                          ...current,
                                          openingBlocks: current.openingBlocks.map((entry) => {
                                            if (entry.id !== block.id || entry.type !== 'expectation_flow') return entry
                                            return { ...entry, items: entry.items.filter((candidate) => candidate.id !== item.id) }
                                          }),
                                        }))}>
                                          Remove
                                        </FoundationButton>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setExperienceConfig((current) => ({
                                  ...current,
                                  openingBlocks: current.openingBlocks.map((entry) => {
                                    if (entry.id !== block.id || entry.type !== 'expectation_flow') return entry
                                    return {
                                      ...entry,
                                      items: [...entry.items, { id: createId('expectation-item'), title: 'New step', body: 'Add concise guidance for candidates here.' }],
                                    }
                                  }),
                                }))}>
                                  Add step
                                </FoundationButton>
                              </>
                            ) : null}

                            {block.type === 'trust_note' ? (
                              <div className="space-y-3">
                                <input
                                  value={block.eyebrow}
                                  onChange={(event) => setExperienceConfig((current) => ({
                                    ...current,
                                    openingBlocks: current.openingBlocks.map((entry) => (
                                      entry.id === block.id && entry.type === 'trust_note'
                                        ? { ...entry, eyebrow: event.target.value }
                                        : entry
                                    )),
                                  }))}
                                  className={inputClass()}
                                />
                                <input
                                  value={block.title}
                                  onChange={(event) => setExperienceConfig((current) => ({
                                    ...current,
                                    openingBlocks: current.openingBlocks.map((entry) => (
                                      entry.id === block.id && entry.type === 'trust_note'
                                        ? { ...entry, title: event.target.value }
                                        : entry
                                    )),
                                  }))}
                                  className={inputClass()}
                                />
                                <FoundationTextarea
                                  value={block.body}
                                  onChange={(event) => setExperienceConfig((current) => ({
                                    ...current,
                                    openingBlocks: current.openingBlocks.map((entry) => (
                                      entry.id === block.id && entry.type === 'trust_note'
                                        ? { ...entry, body: event.target.value }
                                        : entry
                                    )),
                                  }))}
                                  rows={4}
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedPage.type === 'registration' || selectedPage.type === 'demographics' || selectedPage.type === 'completion' ? (
                <ComposableScreenEditor
                  value={systemScreenContent[selectedPage.type as SystemContentKey]}
                  onChange={(patch) => updateSystemContent(selectedPage.type as SystemContentKey, patch)}
                  onBlocksChange={(blocks) => updateSystemBlocks(selectedPage.type as SystemContentKey, blocks)}
                  showHref={selectedPage.type === 'completion'}
                />
              ) : null}

              {selectedPage.type === 'assessment' ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-[var(--admin-text-primary)]">Question intro eyebrow</span>
                      <input
                        value={experienceConfig.questionIntroEyebrow}
                        onChange={(event) => setExperienceConfig((current) => ({ ...current, questionIntroEyebrow: event.target.value }))}
                        className={inputClass()}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-[var(--admin-text-primary)]">Question intro title</span>
                      <input
                        value={experienceConfig.questionIntroTitle}
                        onChange={(event) => setExperienceConfig((current) => ({ ...current, questionIntroTitle: event.target.value }))}
                        className={inputClass()}
                      />
                    </label>
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">Question intro body</span>
                    <FoundationTextarea
                      value={experienceConfig.questionIntroBody}
                      onChange={(event) => setExperienceConfig((current) => ({ ...current, questionIntroBody: event.target.value }))}
                      rows={4}
                    />
                  </label>
                </div>
              ) : null}

              {selectedPage.type === 'screen' && selectedPage.flowStep ? (
                <ComposableScreenEditor
                  value={{
                    eyebrow: selectedPage.flowStep.screen_config.eyebrow,
                    title: selectedPage.flowStep.screen_config.title,
                    body: selectedPage.flowStep.screen_config.body_markdown,
                    ctaLabel: selectedPage.flowStep.screen_config.cta_label,
                    blocks: selectedPage.flowStep.screen_config.blocks,
                    ctaHref: '',
                  }}
                  onChange={(patch) => updateScreenConfig(selectedPage.flowStep!.id, {
                    eyebrow: patch.eyebrow,
                    title: patch.title,
                    body_markdown: patch.body,
                    cta_label: patch.ctaLabel,
                  })}
                  onBlocksChange={(blocks) => updateScreenConfig(selectedPage.flowStep!.id, { blocks })}
                  extraFields={(
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-[var(--admin-text-primary)]">Visual style</span>
                      <FoundationSelect
                        value={selectedPage.flowStep.screen_config.visual_style}
                        onChange={(event) => updateScreenConfig(selectedPage.flowStep!.id, {
                          visual_style: event.target.value === 'transition' ? 'transition' : 'standard',
                        })}
                      >
                        <option value="standard">Standard</option>
                        <option value="transition">Transition</option>
                      </FoundationSelect>
                    </label>
                  )}
                />
              ) : null}

              {selectedPage.type === 'finalising' ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-[var(--admin-text-primary)]">Kicker</span>
                      <input
                        value={experienceConfig.finalisingKicker}
                        onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingKicker: event.target.value }))}
                        className={inputClass()}
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm font-medium text-[var(--admin-text-primary)]">Status label</span>
                      <input
                        value={experienceConfig.finalisingStatusLabel}
                        onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingStatusLabel: event.target.value }))}
                        className={inputClass()}
                      />
                    </label>
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">Title</span>
                    <input
                      value={experienceConfig.finalisingTitle}
                      onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingTitle: event.target.value }))}
                      className={inputClass()}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">Body</span>
                    <FoundationTextarea
                      value={experienceConfig.finalisingBody}
                      onChange={(event) => setExperienceConfig((current) => ({ ...current, finalisingBody: event.target.value }))}
                      rows={4}
                    />
                  </label>
                </div>
              ) : null}
            </FoundationSurface>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'preview' ? (
        <div className="mt-6 space-y-5">
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {resolvedJourney.pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedPageId(page.id)}
                  className={[
                    'rounded-full border px-4 py-2 text-sm font-medium',
                    selectedPageId === page.id
                      ? 'border-[rgba(26,111,223,0.3)] bg-[rgba(26,111,223,0.08)] text-[var(--admin-text-primary)]'
                      : 'border-[rgba(103,127,159,0.16)] bg-white text-[var(--admin-text-muted)]',
                  ].join(' ')}
                >
                  {String(index + 1).padStart(2, '0')} · {pageTypeLabel(page.type)}
                </button>
              ))}
            </div>
          </div>

          {selectedPage ? (
            <FoundationSurface className="p-8">
              <JourneyPreviewSurface
                page={selectedPage}
                runnerConfig={runnerConfig}
                experienceConfig={experienceConfig}
                campaignConfig={campaignConfig}
              />
            </FoundationSurface>
          ) : null}
        </div>
      ) : null}
    </DashboardPageShell>
  )
}

function ComposableScreenEditor({
  value,
  onChange,
  onBlocksChange,
  showHref = false,
  extraFields,
}: {
  value: CampaignJourneyComposableScreenContent
  onChange: (patch: Partial<CampaignJourneyComposableScreenContent>) => void
  onBlocksChange: (blocks: CampaignScreenContentBlock[]) => void
  showHref?: boolean
  extraFields?: ReactNode
}) {
  function updateBlock(blockId: string, updater: (block: CampaignScreenContentBlock) => CampaignScreenContentBlock) {
    onBlocksChange(value.blocks.map((block) => (block.id === blockId ? updater(block) : block)))
  }

  function moveBlock(blockId: string, direction: 'up' | 'down') {
    const index = value.blocks.findIndex((block) => block.id === blockId)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= value.blocks.length) return
    onBlocksChange(moveItem(value.blocks, index, targetIndex))
  }

  function addCard(blockId: string) {
    updateBlock(blockId, (block) =>
      block.type === 'card_list'
        ? {
            ...block,
            cards: [...block.cards, { id: createId('card'), title: 'New card', body: 'Add supporting guidance here.' }],
          }
        : block
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-[var(--admin-text-primary)]">Eyebrow</span>
          <input value={value.eyebrow} onChange={(event) => onChange({ eyebrow: event.target.value })} className={inputClass()} />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-[var(--admin-text-primary)]">CTA label</span>
          <input value={value.ctaLabel} onChange={(event) => onChange({ ctaLabel: event.target.value })} className={inputClass()} />
        </label>
      </div>
      <label className="space-y-1.5">
        <span className="text-sm font-medium text-[var(--admin-text-primary)]">Title</span>
        <input value={value.title} onChange={(event) => onChange({ title: event.target.value })} className={inputClass()} />
      </label>
      <label className="space-y-1.5">
        <span className="text-sm font-medium text-[var(--admin-text-primary)]">Body</span>
        <FoundationTextarea value={value.body} onChange={(event) => onChange({ body: event.target.value })} rows={4} />
      </label>
      {showHref ? (
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-[var(--admin-text-primary)]">CTA href</span>
          <input value={value.ctaHref ?? ''} onChange={(event) => onChange({ ctaHref: event.target.value })} className={inputClass()} />
        </label>
      ) : null}
      {extraFields}

      <div className="rounded-[1.4rem] border border-[rgba(99,122,150,0.14)] bg-[rgba(246,248,251,0.75)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Sections</h3>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Add supporting sections and card groups for this screen.
            </p>
          </div>
          <div className="flex gap-2">
            <FoundationButton type="button" variant="secondary" size="sm" onClick={() => onBlocksChange([...value.blocks, createParagraphBlock()])}>
              Add section
            </FoundationButton>
            <FoundationButton type="button" variant="secondary" size="sm" onClick={() => onBlocksChange([...value.blocks, createCardListBlock()])}>
              Add cards
            </FoundationButton>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {value.blocks.map((block, index) => (
            <div key={block.id} className="rounded-[1.25rem] border border-[rgba(99,122,150,0.14)] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">
                    Block {index + 1}
                  </p>
                  <h4 className="mt-1 text-base font-semibold text-[var(--admin-text-primary)]">
                    {block.type === 'paragraph' ? 'Section' : 'Card group'}
                  </h4>
                </div>
                <div className="flex gap-2">
                  <FoundationButton type="button" variant="secondary" size="sm" onClick={() => moveBlock(block.id, 'up')} disabled={index === 0}>
                    Up
                  </FoundationButton>
                  <FoundationButton type="button" variant="secondary" size="sm" onClick={() => moveBlock(block.id, 'down')} disabled={index === value.blocks.length - 1}>
                    Down
                  </FoundationButton>
                  <FoundationButton type="button" variant="secondary" size="sm" onClick={() => onBlocksChange(value.blocks.filter((entry) => entry.id !== block.id))}>
                    Remove
                  </FoundationButton>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  value={block.eyebrow}
                  onChange={(event) => updateBlock(block.id, (current) => ({ ...current, eyebrow: event.target.value }))}
                  className={inputClass()}
                  placeholder="Eyebrow"
                />
                <input
                  value={block.title}
                  onChange={(event) => updateBlock(block.id, (current) => ({ ...current, title: event.target.value }))}
                  className={inputClass()}
                  placeholder="Section title"
                />

                {block.type === 'paragraph' ? (
                  <FoundationTextarea
                    value={block.body}
                    onChange={(event) => updateBlock(block.id, (current) => current.type === 'paragraph' ? { ...current, body: event.target.value } : current)}
                    rows={4}
                  />
                ) : (
                  <div className="space-y-3">
                    {block.cards.map((card: CampaignScreenSectionCard, cardIndex) => (
                      <div key={card.id} className="rounded-2xl border border-[rgba(103,127,159,0.12)] bg-[rgba(246,248,251,0.65)] p-4">
                        <div className="space-y-3">
                          <input
                            value={card.title}
                            onChange={(event) => updateBlock(block.id, (current) => {
                              if (current.type !== 'card_list') return current
                              return {
                                ...current,
                                cards: current.cards.map((entry) => entry.id === card.id ? { ...entry, title: event.target.value } : entry),
                              }
                            })}
                            className={inputClass()}
                          />
                          <FoundationTextarea
                            value={card.body}
                            onChange={(event) => updateBlock(block.id, (current) => {
                              if (current.type !== 'card_list') return current
                              return {
                                ...current,
                                cards: current.cards.map((entry) => entry.id === card.id ? { ...entry, body: event.target.value } : entry),
                              }
                            })}
                            rows={3}
                          />
                          <FoundationButton type="button" variant="secondary" size="sm" onClick={() => updateBlock(block.id, (current) => {
                            if (current.type !== 'card_list') return current
                            return { ...current, cards: current.cards.filter((entry) => entry.id !== card.id) }
                          })} disabled={block.cards.length === 1 && cardIndex === 0}>
                            Remove card
                          </FoundationButton>
                        </div>
                      </div>
                    ))}
                    <FoundationButton type="button" variant="secondary" size="sm" onClick={() => addCard(block.id)}>
                      Add card
                    </FoundationButton>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function JourneyPreviewSurface({
  page,
  runnerConfig,
  experienceConfig,
  campaignConfig,
}: {
  page: CampaignJourneyResolvedPage
  runnerConfig: RunnerConfig
  experienceConfig: AssessmentExperienceConfig
  campaignConfig: CampaignConfig
}) {
  if (page.type === 'intro') {
    return (
      <AssessmentOpeningPanel
        runnerConfig={runnerConfig}
        experienceConfig={{ ...experienceConfig, openingBlocks: page.openingBlocks }}
        title={page.title}
        subtitle={page.description}
        intro={page.eyebrow}
        contextLabel="Campaign preview"
        ctaLabel={page.ctaLabel ?? 'Continue'}
      />
    )
  }

  if (page.type === 'registration') {
    return (
      <CampaignRegistrationStep
        campaignConfig={campaignConfig}
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        submitLabel={page.ctaLabel ?? 'Continue'}
        blocks={page.blocks}
        showIdentityFields
        showDemographicFields={false}
        onSubmitParticipant={async () => Promise.resolve()}
      />
    )
  }

  if (page.type === 'demographics') {
    return (
      <CampaignRegistrationStep
        campaignConfig={campaignConfig}
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        submitLabel={page.ctaLabel ?? 'Continue'}
        blocks={page.blocks}
        showIdentityFields={false}
        showDemographicFields
        onSubmitParticipant={async () => Promise.resolve()}
      />
    )
  }

  if (page.type === 'assessment') {
    return (
      <section className="space-y-6 rounded-[2rem] border border-[rgba(99,122,150,0.14)] bg-white p-8">
        {page.eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-text-soft)]">{page.eyebrow}</p> : null}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--admin-text-primary)]">{page.title}</h2>
          <p className="text-sm leading-relaxed text-[var(--admin-text-muted)]">{page.description}</p>
        </div>
        <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(246,248,251,0.72)] p-5">
          <p className="text-sm font-medium text-[var(--admin-text-primary)]">Question screen preview</p>
          {experienceConfig.questionIntroTitle ? (
            <div className="mt-4 space-y-2">
              {experienceConfig.questionIntroEyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">{experienceConfig.questionIntroEyebrow}</p> : null}
              <h3 className="text-lg font-semibold text-[var(--admin-text-primary)]">{experienceConfig.questionIntroTitle}</h3>
              {experienceConfig.questionIntroBody ? <p className="text-sm leading-relaxed text-[var(--admin-text-muted)]">{experienceConfig.questionIntroBody}</p> : null}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[rgba(103,127,159,0.14)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Prompt</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--admin-text-primary)]">I create clarity for others when situations are complex.</p>
            </div>
            <div className="rounded-2xl border border-[rgba(103,127,159,0.14)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Response scale</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'].map((label) => (
                  <span key={label} className="rounded-full border border-[rgba(103,127,159,0.14)] px-3 py-2 text-xs font-medium text-[var(--admin-text-muted)]">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (page.type === 'screen' || page.type === 'completion') {
    return (
      <section className="rounded-[2rem] border border-[rgba(99,122,150,0.14)] bg-white p-8">
        {page.eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--admin-text-soft)]">{page.eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">{page.title}</h2>
        {page.description ? <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--admin-text-muted)]">{page.description}</p> : null}
        <ScreenBlocksPreview blocks={page.blocks} />
        {page.type === 'completion' ? (
          <div className="mt-8">
            <AssessmentCompletionPanel
              title={page.title}
              body={page.description}
              cta={page.ctaLabel ?? 'Continue'}
              action={<AssessmentPreviewAction label={page.ctaLabel ?? 'Continue'} />}
            />
          </div>
        ) : (
          <div className="mt-8">
            <AssessmentPreviewAction label={page.ctaLabel ?? 'Continue'} />
          </div>
        )}
      </section>
    )
  }

  if (page.type === 'finalising') {
    return <AssessmentFinalisingPanel experienceConfig={experienceConfig} />
  }

  return null
}
