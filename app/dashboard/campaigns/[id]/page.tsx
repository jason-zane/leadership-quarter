'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  DEFAULT_REPORT_CONFIG,
  DEFAULT_RUNNER_CONFIG,
  normalizeRunnerConfig,
  resolveCampaignRunnerConfig,
} from '@/utils/assessments/experience-config'
import {
  DEMOGRAPHICS_FIELD_OPTIONS,
  type CampaignConfig,
  type CampaignStatus,
  type RegistrationPosition,
  type ReportAccess,
} from '@/utils/assessments/campaign-types'
import { InviteDialog } from '@/components/dashboard/invite-dialog'
import {
  RUNNER_FIELD_KEYS,
  RUNNER_SECTION_ITEMS,
  type RunnerSectionKey,
  RunnerConfigForm,
  type RunnerOverrideConfig,
  compactRunnerOverrides,
} from '@/components/dashboard/config-editor/runner-config-form'
import { ContextualPreview, type PreviewTabKey } from '@/components/dashboard/config-editor/contextual-preview'
import { SectionStepper } from '@/components/dashboard/config-editor/section-stepper'

type CampaignAssessment = {
  id: string
  assessment_id: string
  sort_order?: number
  is_active: boolean
  assessments: {
    id: string
    key: string
    name: string
    description?: string | null
    status: string
    runner_config?: unknown
  } | null
}

type Campaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  config: CampaignConfig
  runner_overrides?: Record<string, unknown>
  organisation_id: string | null
  created_at: string
  updated_at: string
  organisations: { id: string; name: string; slug: string } | null
  campaign_assessments: CampaignAssessment[]
}

type Organisation = { id: string; name: string; slug: string }

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['active'],
  active: ['closed'],
  closed: ['archived', 'active'],
  archived: [],
}

function getSiteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function isValidHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?')) return true
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function hasErrors(value: Record<string, string | undefined>) {
  return Object.values(value).some(Boolean)
}

export default function CampaignOverviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const campaignId = params.id
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [responseCount, setResponseCount] = useState<number | null>(null)
  const [runnerOverridesEnabled, setRunnerOverridesEnabled] = useState(false)
  const [activeOverrideSection, setActiveOverrideSection] = useState<RunnerSectionKey>('intro')
  const [expandOverrideSections, setExpandOverrideSections] = useState(false)
  const [overridePreviewTab, setOverridePreviewTab] = useState<PreviewTabKey>('intro')
  const [runnerOverrides, setRunnerOverrides] = useState<RunnerOverrideConfig>({})
  const [runnerOverridesRaw, setRunnerOverridesRaw] = useState<Record<string, unknown>>({})
  const [overridesSaving, setOverridesSaving] = useState(false)
  const [overridesError, setOverridesError] = useState<string | null>(null)
  const [overridesSavedAt, setOverridesSavedAt] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [orgId, setOrgId] = useState('')
  const [registrationPosition, setRegistrationPosition] = useState<RegistrationPosition>('before')
  const [reportAccess, setReportAccess] = useState<ReportAccess>('immediate')
  const [demographicsEnabled, setDemographicsEnabled] = useState(false)
  const [demographicsFields, setDemographicsFields] = useState<string[]>([])
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSavedAt, setConfigSavedAt] = useState<string | null>(null)

  function hydrateEditForm(nextCampaign: Campaign | null) {
    if (!nextCampaign) return
    setName(nextCampaign.name)
    setSlug(nextCampaign.slug)
    setOrgId(nextCampaign.organisation_id ?? '')
    setRegistrationPosition(nextCampaign.config.registration_position)
    setReportAccess(nextCampaign.config.report_access)
    setDemographicsEnabled(nextCampaign.config.demographics_enabled)
    setDemographicsFields(nextCampaign.config.demographics_fields ?? [])
  }

  async function reloadCampaign() {
    const [campaignRes, responsesRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as { campaign?: Campaign }
    const nextCampaign = campaignBody.campaign ?? null
    setCampaign(nextCampaign)
    const rawOverrides = asObject(nextCampaign?.runner_overrides)
    setRunnerOverridesRaw(rawOverrides)
    const normalizedOverrides = normalizeRunnerConfig({ ...DEFAULT_RUNNER_CONFIG, ...rawOverrides })
    const knownOverrides = Object.fromEntries(
      Object.keys(rawOverrides)
        .filter((key) => RUNNER_FIELD_KEYS.has(key))
        .map((key) => [key, normalizedOverrides[key as keyof typeof normalizedOverrides]])
    ) as RunnerOverrideConfig
    setRunnerOverrides(knownOverrides)
    setRunnerOverridesEnabled(Object.keys(rawOverrides).length > 0)
    hydrateEditForm(nextCampaign)

    if (responsesRes.ok) {
      const responsesBody = (await responsesRes.json()) as { responses?: unknown[] }
      setResponseCount(responsesBody.responses?.length ?? 0)
    }

    setLoading(false)
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)

      const [campaignRes, responsesRes, orgRes] = await Promise.all([
        fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
        fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
        fetch('/api/admin/organisations?pageSize=200', { cache: 'no-store' }),
      ])

      const campaignBody = (await campaignRes.json()) as { campaign?: Campaign }
      const responsesBody = responsesRes.ok ? ((await responsesRes.json()) as { responses?: unknown[] }) : { responses: [] }
      const orgBody = (await orgRes.json().catch(() => null)) as { organisations?: Organisation[] } | null

      if (!active) return
      const nextCampaign = campaignBody.campaign ?? null
      setCampaign(nextCampaign)
      const rawOverrides = asObject(nextCampaign?.runner_overrides)
      setRunnerOverridesRaw(rawOverrides)
      const normalizedOverrides = normalizeRunnerConfig({ ...DEFAULT_RUNNER_CONFIG, ...rawOverrides })
      const knownOverrides = Object.fromEntries(
        Object.keys(rawOverrides)
          .filter((key) => RUNNER_FIELD_KEYS.has(key))
          .map((key) => [key, normalizedOverrides[key as keyof typeof normalizedOverrides]])
      ) as RunnerOverrideConfig
      setRunnerOverrides(knownOverrides)
      setRunnerOverridesEnabled(Object.keys(rawOverrides).length > 0)
      hydrateEditForm(nextCampaign)
      setResponseCount(responsesBody.responses?.length ?? 0)
      setOrganisations(orgBody?.organisations ?? [])
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [campaignId])

  async function setStatus(status: CampaignStatus) {
    setSaving(true)
    await fetch(`/api/admin/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await reloadCampaign()
    setSaving(false)
  }

  function toggleDemographicsField(field: string) {
    setDemographicsFields((prev) => (prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]))
  }

  async function saveCampaignConfig() {
    setConfigSaving(true)
    setConfigError(null)
    setConfigSavedAt(null)

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: normalizeSlug(slug),
          organisation_id: orgId || null,
          config: {
            registration_position: registrationPosition,
            report_access: reportAccess,
            demographics_enabled: demographicsEnabled,
            demographics_fields: demographicsEnabled ? demographicsFields : [],
          },
        }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        if (body?.error === 'slug_taken') {
          setConfigError('That slug is already in use.')
          return
        }
        if (body?.error === 'invalid_slug') {
          setConfigError('Slug must contain only lowercase letters, numbers, and dashes.')
          return
        }
        setConfigError(body?.error ?? 'Failed to save campaign configuration.')
        return
      }
      setConfigSavedAt(new Date().toLocaleTimeString())
      await reloadCampaign()
    } finally {
      setConfigSaving(false)
    }
  }

  async function saveRunnerOverrides() {
    setOverridesError(null)
    setOverridesSavedAt(null)

    if (overrideValidationFailed) {
      setOverridesError('Fix override validation issues before saving.')
      return
    }

    const unknownOverrides = Object.fromEntries(
      Object.entries(runnerOverridesRaw).filter(([key]) => !RUNNER_FIELD_KEYS.has(key))
    )
    const mergedOverrides = runnerOverridesEnabled
      ? { ...unknownOverrides, ...compactRunnerOverrides(runnerOverrides) }
      : unknownOverrides

    setOverridesSaving(true)
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_overrides: mergedOverrides }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        setOverridesError(body?.error ?? 'Failed to save runner overrides.')
        return
      }
      setOverridesSavedAt(new Date().toLocaleTimeString())
      await reloadCampaign()
    } finally {
      setOverridesSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading...</p>
  }

  if (!campaign) {
    return <p className="text-sm text-red-500">Campaign not found.</p>
  }

  const campaignUrl = `${getSiteUrl()}/assess/c/${campaign.slug}`
  const activeAssessments = campaign.campaign_assessments.filter((assessment) => assessment.is_active).length
  const transitions = STATUS_TRANSITIONS[campaign.status] ?? []
  const overrideErrors: Partial<Record<keyof typeof DEFAULT_RUNNER_CONFIG, string>> = {}
  if (typeof runnerOverrides.estimated_minutes !== 'undefined') {
    if (
      !Number.isFinite(runnerOverrides.estimated_minutes) ||
      runnerOverrides.estimated_minutes < 1 ||
      runnerOverrides.estimated_minutes > 240
    ) {
      overrideErrors.estimated_minutes = 'Estimated minutes must be between 1 and 240.'
    }
  }
  if (
    typeof runnerOverrides.completion_screen_cta_href === 'string' &&
    !isValidHref(runnerOverrides.completion_screen_cta_href)
  ) {
    overrideErrors.completion_screen_cta_href = 'Completion CTA link must be a valid URL or relative path.'
  }
  const overrideValidationFailed = runnerOverridesEnabled && hasErrors(overrideErrors as Record<string, string | undefined>)
  const previewAssessment =
    campaign.campaign_assessments
      .filter((assessment) => assessment.is_active && assessment.assessments)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]
      ?.assessments ?? null
  const previewRunner = resolveCampaignRunnerConfig(
    previewAssessment?.runner_config ?? DEFAULT_RUNNER_CONFIG,
    runnerOverridesEnabled ? compactRunnerOverrides(runnerOverrides) : {},
    {
      campaignName: campaign.name,
      organisationName: campaign.organisations?.name ?? null,
      assessmentName: previewAssessment?.name ?? null,
    }
  )
  const overrideVisibleSections = expandOverrideSections
    ? RUNNER_SECTION_ITEMS.map((section) => section.id)
    : RUNNER_SECTION_ITEMS.filter((section) => section.id === activeOverrideSection).map((section) => section.id)

  function sectionToPreviewTab(section: RunnerSectionKey): PreviewTabKey {
    if (section === 'intro' || section === 'actions') return 'intro'
    if (section === 'completion') return 'completion'
    return 'question'
  }

  async function deleteCampaign() {
    if (!campaign || deleteConfirmName !== campaign.name) return
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch(`/api/admin/campaigns/${campaignId}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      setDeleteError('Failed to delete campaign.')
      return
    }
    router.push('/dashboard/campaigns')
  }

  const surveyOptions = campaign.campaign_assessments
    .filter((assessment) => assessment.assessments)
    .map((assessment) => ({ id: assessment.assessment_id, name: assessment.assessments!.name }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusColors[campaign.status] ?? statusColors.draft}`}>
          {campaign.status}
        </span>
        {transitions.map((next) => (
          <button
            key={next}
            onClick={() => void setStatus(next)}
            disabled={saving}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {next === 'active' ? 'Activate' : next === 'closed' ? 'Close' : next === 'archived' ? 'Archive' : next}
          </button>
        ))}
        {surveyOptions.length > 0 ? (
          <InviteDialog assessments={surveyOptions} onInvited={() => void reloadCampaign()} />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Assessments" value={activeAssessments} />
        <StatCard label="Organisation" value={campaign.organisations?.name ?? 'Public'} />
        <StatCard label="Registration" value={campaign.config.registration_position} />
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Responses</p>
          <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">{responseCount ?? '—'}</p>
          <Link href={`/dashboard/campaigns/${campaignId}/responses`} className="mt-1 block text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            View all →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Campaign URL</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {campaignUrl}
          </code>
          <CopyButton text={campaignUrl} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Edit campaign</p>
        <p className="mb-4 text-xs text-zinc-500">Update campaign settings and experience controls.</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Organisation</span>
            <select
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">None (public)</option>
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Registration position</span>
            <select
              value={registrationPosition}
              onChange={(event) => setRegistrationPosition(event.target.value as RegistrationPosition)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="before">Before assessment</option>
              <option value="after">After assessment</option>
              <option value="none">None (anonymous)</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Report access</span>
            <select
              value={reportAccess}
              onChange={(event) => setReportAccess(event.target.value as ReportAccess)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="immediate">Immediate</option>
              <option value="gated">Gated</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={demographicsEnabled}
              onChange={(event) => setDemographicsEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            Collect demographics
          </label>
        </div>

        {demographicsEnabled ? (
          <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Demographics fields</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {DEMOGRAPHICS_FIELD_OPTIONS.map((field) => (
                <label key={field.key} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={demographicsFields.includes(field.key)}
                    onChange={() => toggleDemographicsField(field.key)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {configError ? <p className="mt-3 text-sm text-red-600">{configError}</p> : null}
        {configSavedAt ? <p className="mt-3 text-xs text-emerald-600">Saved at {configSavedAt}</p> : null}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void saveCampaignConfig()}
            disabled={configSaving}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {configSaving ? 'Saving...' : 'Save campaign settings'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Configuration</p>
        <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <ConfigRow label="Report access" value={campaign.config.report_access} />
          <ConfigRow label="Demographics" value={campaign.config.demographics_enabled ? 'Enabled' : 'Disabled'} />
          <ConfigRow label="Created" value={new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(campaign.created_at))} />
        </dl>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Experience overrides</p>
        <p className="mb-3 text-xs text-zinc-500">Review the default campaign experience, then override assessment runner copy only when needed.</p>
        <label className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={runnerOverridesEnabled}
            onChange={(event) => setRunnerOverridesEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
          />
          Enable campaign-specific assessment text overrides
        </label>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
              <p className="font-medium text-zinc-700 dark:text-zinc-200">Default campaign experience</p>
              <p className="mt-1">
                This preview shows the resolved campaign experience when overrides are off. Title uses the campaign name,
                intro is campaign-aware, and subtitle stays standardised.
              </p>
            </div>
            {runnerOverridesEnabled ? (
              <>
                <SectionStepper
                  items={RUNNER_SECTION_ITEMS}
                  activeId={activeOverrideSection}
                  onChange={(section) => {
                    const next = section as RunnerSectionKey
                    setActiveOverrideSection(next)
                    setOverridePreviewTab(sectionToPreviewTab(next))
                  }}
                  expandAll={expandOverrideSections}
                  onToggleExpandAll={() => setExpandOverrideSections((current) => !current)}
                />
                <RunnerConfigForm
                  mode="override"
                  value={runnerOverrides}
                  onChange={setRunnerOverrides}
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
            onTabChange={setOverridePreviewTab}
          />
        </div>
        {overridesError ? <p className="mt-2 text-sm text-red-600">{overridesError}</p> : null}
        {overridesSavedAt ? <p className="mt-2 text-xs text-emerald-600">Saved at {overridesSavedAt}</p> : null}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void saveRunnerOverrides()}
            disabled={overridesSaving || overrideValidationFailed}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {overridesSaving ? 'Saving...' : 'Save overrides'}
          </button>
        </div>
      </div>

      {campaign.status === 'archived' && (
        <div className="rounded-xl border border-red-200 bg-white dark:border-red-900/40 dark:bg-zinc-900">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
          </div>
          <div className="border-t border-red-100 px-5 py-4 dark:border-red-900/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Delete campaign</p>
                <p className="text-xs text-zinc-500">Permanently delete this campaign and all its data. This cannot be undone.</p>
              </div>
              {!showDeleteConfirm && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              )}
            </div>

            {showDeleteConfirm && (
              <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">
                  Type <span className="font-mono">{campaign.name}</span> to confirm deletion
                </p>
                <input
                  type="text"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={campaign.name}
                  className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm dark:border-red-800 dark:bg-zinc-900"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void deleteCampaign()}
                    disabled={deleting || deleteConfirmName !== campaign.name}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Permanently delete'}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName('') }}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
                {deleteError ? <p className="text-sm text-red-600">{deleteError}</p> : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={() => void copy()}
      className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
