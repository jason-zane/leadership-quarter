'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSelect, FoundationTextarea } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import type { CampaignFlowStep, CampaignScreenStepConfig } from '@/utils/assessments/campaign-types'

type CampaignAssessmentRow = {
  id: string
  assessment_id: string
  is_active: boolean
  assessments: {
    id: string
    key: string
    name: string
    external_name?: string
    status: string
  } | null
}

type CampaignResponse = {
  campaign?: {
    id: string
    name: string
    external_name: string
    campaign_assessments: CampaignAssessmentRow[]
  }
}

type FlowResponse = {
  flowSteps?: CampaignFlowStep[]
}

type AssessmentOption = {
  id: string
  name: string
  key: string
  status: string
}

function emptyScreenDraft(): CampaignScreenStepConfig {
  return {
    title: 'Next assessment',
    body_markdown: 'Continue to the next step in this campaign.',
    cta_label: 'Continue',
    visual_style: 'standard',
  }
}

export default function CampaignFlowPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const [campaignName, setCampaignName] = useState('Campaign flow')
  const [campaignAssessments, setCampaignAssessments] = useState<CampaignAssessmentRow[]>([])
  const [flowSteps, setFlowSteps] = useState<CampaignFlowStep[]>([])
  const [availableAssessments, setAvailableAssessments] = useState<AssessmentOption[]>([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [newScreenDraft, setNewScreenDraft] = useState<CampaignScreenStepConfig>(emptyScreenDraft())
  const [showScreenComposer, setShowScreenComposer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyStepId, setBusyStepId] = useState<string | null>(null)
  const [addingAssessment, setAddingAssessment] = useState(false)
  const [addingScreen, setAddingScreen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [campaignRes, flowRes, assessmentsRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/admin/campaigns/${campaignId}/flow`, { cache: 'no-store' }),
      fetch('/api/admin/assessments', { cache: 'no-store' }),
    ])

    const campaignBody = (await campaignRes.json().catch(() => null)) as CampaignResponse | null
    const flowBody = (await flowRes.json().catch(() => null)) as FlowResponse | null
    const assessmentBody = (await assessmentsRes.json().catch(() => null)) as { assessments?: AssessmentOption[]; surveys?: AssessmentOption[] } | null

    if (!campaignRes.ok || !flowRes.ok) {
      setError('Failed to load campaign flow.')
      setLoading(false)
      return
    }

    const assessments = campaignBody?.campaign?.campaign_assessments ?? []
    const attachedAssessmentIds = new Set(assessments.map((item) => item.assessment_id))
    const available = (assessmentBody?.assessments ?? assessmentBody?.surveys ?? [])
      .filter((assessment) => assessment.status === 'active' && !attachedAssessmentIds.has(assessment.id))

    setCampaignName(campaignBody?.campaign?.name ?? 'Campaign flow')
    setCampaignAssessments(assessments)
    setFlowSteps(flowBody?.flowSteps ?? [])
    setAvailableAssessments(available)
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  const campaignAssessmentById = useMemo(
    () => new Map(campaignAssessments.map((item) => [item.id, item])),
    [campaignAssessments]
  )

  async function addAssessmentStep() {
    if (!selectedAssessmentId) return
    setAddingAssessment(true)
    setError(null)

    const response = await fetch(`/api/admin/campaigns/${campaignId}/flow/steps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step_type: 'assessment',
        assessment_id: selectedAssessmentId,
      }),
    })

    setAddingAssessment(false)
    if (!response.ok) {
      setError('Could not add that assessment to the flow.')
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
      body: JSON.stringify({
        step_type: 'screen',
        screen_config: newScreenDraft,
      }),
    })

    setAddingScreen(false)
    if (!response.ok) {
      setError('Could not add that screen to the flow.')
      return
    }

    setShowScreenComposer(false)
    setNewScreenDraft(emptyScreenDraft())
    await load()
  }

  async function moveStep(stepId: string, direction: 'up' | 'down') {
    setBusyStepId(stepId)
    await fetch(`/api/admin/campaigns/${campaignId}/flow/steps/${stepId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    })
    setBusyStepId(null)
    await load()
  }

  async function toggleStep(step: CampaignFlowStep) {
    setBusyStepId(step.id)
    await fetch(`/api/admin/campaigns/${campaignId}/flow/steps/${step.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !step.is_active }),
    })
    setBusyStepId(null)
    await load()
  }

  async function deleteStep(stepId: string) {
    setBusyStepId(stepId)
    await fetch(`/api/admin/campaigns/${campaignId}/flow/steps/${stepId}`, {
      method: 'DELETE',
    })
    setBusyStepId(null)
    await load()
  }

  async function saveScreen(stepId: string, screenConfig: CampaignScreenStepConfig) {
    setBusyStepId(stepId)
    await fetch(`/api/admin/campaigns/${campaignId}/flow/steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screen_config: screenConfig }),
    })
    setBusyStepId(null)
    await load()
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title="Flow"
        description={`Design the linear campaign journey for ${campaignName}, including ordered assessments and transition screens.`}
      />

      <DashboardKpiStrip
        items={[
          { label: 'Flow steps', value: flowSteps.length },
          { label: 'Assessments', value: flowSteps.filter((step) => step.step_type === 'assessment').length },
          { label: 'Screens', value: flowSteps.filter((step) => step.step_type === 'screen').length },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <FoundationSurface className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Journey builder</h2>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                Build a simple linear sequence. Use screens to add guidance between assessments.
              </p>
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : null}

          {loading ? (
            <p className="text-sm text-[var(--admin-text-muted)]">Loading flow…</p>
          ) : flowSteps.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[rgba(103,127,159,0.24)] px-6 py-10 text-center">
              <p className="text-sm font-medium text-[var(--admin-text-primary)]">No flow steps yet.</p>
              <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                Add an assessment or a transition screen to begin shaping this campaign.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {flowSteps.map((step, index) => {
                const assessmentRow = step.campaign_assessment_id
                  ? campaignAssessmentById.get(step.campaign_assessment_id) ?? null
                  : null
                const busy = busyStepId === step.id

                return (
                  <FlowStepCard
                    key={step.id}
                    index={index}
                    step={step}
                    busy={busy}
                    assessmentRow={assessmentRow}
                    canMoveUp={index > 0}
                    canMoveDown={index < flowSteps.length - 1}
                    onMoveUp={() => void moveStep(step.id, 'up')}
                    onMoveDown={() => void moveStep(step.id, 'down')}
                    onToggle={() => void toggleStep(step)}
                    onDelete={() => void deleteStep(step.id)}
                    onSaveScreen={(screenConfig) => void saveScreen(step.id, screenConfig)}
                  />
                )
              })}
            </div>
          )}
        </FoundationSurface>

        <div className="space-y-6">
          <FoundationSurface className="space-y-4 p-6">
            <div>
              <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Add assessment</h2>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                Attach another assessment to this campaign and append it to the current flow.
              </p>
            </div>
            <FoundationSelect value={selectedAssessmentId} onChange={(event) => setSelectedAssessmentId(event.target.value)}>
              <option value="">Select an assessment…</option>
              {availableAssessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>{assessment.name}</option>
              ))}
            </FoundationSelect>
            <FoundationButton type="button" onClick={() => void addAssessmentStep()} disabled={!selectedAssessmentId || addingAssessment}>
              {addingAssessment ? 'Adding…' : 'Add assessment step'}
            </FoundationButton>
          </FoundationSurface>

          <FoundationSurface className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Add screen</h2>
                <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                  Insert a basic interstitial screen between assessments.
                </p>
              </div>
              <FoundationButton
                type="button"
                variant="secondary"
                onClick={() => setShowScreenComposer((current) => !current)}
              >
                {showScreenComposer ? 'Hide composer' : 'Compose screen'}
              </FoundationButton>
            </div>

            {showScreenComposer ? (
              <div className="space-y-4 rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,248,252,0.9)] p-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[var(--admin-text-primary)]">Title</span>
                  <input
                    value={newScreenDraft.title}
                    onChange={(event) => setNewScreenDraft((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[var(--admin-text-primary)]">Body</span>
                  <FoundationTextarea
                    value={newScreenDraft.body_markdown}
                    onChange={(event) => setNewScreenDraft((current) => ({ ...current, body_markdown: event.target.value }))}
                    rows={5}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">CTA label</span>
                    <input
                      value={newScreenDraft.cta_label}
                      onChange={(event) => setNewScreenDraft((current) => ({ ...current, cta_label: event.target.value }))}
                      className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-[var(--admin-text-primary)]">Visual style</span>
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
                  </label>
                </div>
                <FoundationButton type="button" onClick={() => void addScreenStep()} disabled={addingScreen}>
                  {addingScreen ? 'Adding…' : 'Add screen step'}
                </FoundationButton>
              </div>
            ) : null}
          </FoundationSurface>

          <FoundationSurface className="space-y-3 p-6">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Advanced</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Per-assessment report delivery and deeper campaign controls are available in a dedicated advanced workspace while this new flow builder settles.
            </p>
            <Link href={`/dashboard/campaigns/${campaignId}/advanced-assessments`} className="text-sm font-medium text-[var(--admin-accent)] hover:underline">
              Open advanced delivery settings
            </Link>
          </FoundationSurface>
        </div>
      </div>
    </DashboardPageShell>
  )
}

function FlowStepCard({
  index,
  step,
  busy,
  assessmentRow,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggle,
  onDelete,
  onSaveScreen,
}: {
  index: number
  step: CampaignFlowStep
  busy: boolean
  assessmentRow: CampaignAssessmentRow | null
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onToggle: () => void
  onDelete: () => void
  onSaveScreen: (screenConfig: CampaignScreenStepConfig) => void
}) {
  const [screenDraft, setScreenDraft] = useState(step.screen_config)

  useEffect(() => {
    setScreenDraft(step.screen_config)
  }, [step.screen_config])

  return (
    <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">
            Step {index + 1} · {step.step_type === 'screen' ? 'Screen' : 'Assessment'}
          </p>
          <h3 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">
            {step.step_type === 'screen'
              ? screenDraft.title
              : assessmentRow?.assessments?.name ?? 'Assessment step'}
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            {step.step_type === 'screen'
              ? screenDraft.body_markdown || 'Transition screen'
              : assessmentRow?.assessments?.external_name ?? assessmentRow?.assessments?.key ?? 'Attached assessment'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onMoveUp} disabled={!canMoveUp || busy} className="rounded-full border px-3 py-1.5 text-sm">
            Up
          </button>
          <button type="button" onClick={onMoveDown} disabled={!canMoveDown || busy} className="rounded-full border px-3 py-1.5 text-sm">
            Down
          </button>
          <button type="button" onClick={onToggle} disabled={busy} className="rounded-full border px-3 py-1.5 text-sm">
            {step.is_active ? 'Disable' : 'Enable'}
          </button>
          <button type="button" onClick={onDelete} disabled={busy} className="rounded-full border border-rose-200 px-3 py-1.5 text-sm text-rose-700">
            Remove
          </button>
        </div>
      </div>

      {step.step_type === 'screen' ? (
        <div className="mt-5 space-y-4 rounded-[1.25rem] bg-[rgba(247,248,252,0.9)] p-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--admin-text-primary)]">Title</span>
            <input
              value={screenDraft.title}
              onChange={(event) => setScreenDraft((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--admin-text-primary)]">Body</span>
            <FoundationTextarea
              value={screenDraft.body_markdown}
              onChange={(event) => setScreenDraft((current) => ({ ...current, body_markdown: event.target.value }))}
              rows={5}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">CTA label</span>
              <input
                value={screenDraft.cta_label}
                onChange={(event) => setScreenDraft((current) => ({ ...current, cta_label: event.target.value }))}
                className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2.5 text-sm"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--admin-text-primary)]">Visual style</span>
              <FoundationSelect
                value={screenDraft.visual_style}
                onChange={(event) => setScreenDraft((current) => ({
                  ...current,
                  visual_style: event.target.value === 'transition' ? 'transition' : 'standard',
                }))}
              >
                <option value="standard">Standard</option>
                <option value="transition">Transition</option>
              </FoundationSelect>
            </label>
          </div>
          <FoundationButton type="button" variant="secondary" onClick={() => onSaveScreen(screenDraft)} disabled={busy}>
            {busy ? 'Saving…' : 'Save screen'}
          </FoundationButton>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.25rem] bg-[rgba(247,248,252,0.9)] p-4 text-sm text-[var(--admin-text-muted)]">
          Assessment-specific report delivery controls will move into this card next. The assessment is already attached and ordered here.
        </div>
      )}
    </div>
  )
}
