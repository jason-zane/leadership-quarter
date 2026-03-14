'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBeforeUnloadWarning, useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  DEFAULT_RUNNER_CONFIG,
  resolveCampaignRunnerConfig,
} from '@/utils/assessments/experience-config'
import {
  type DemographicFieldKey,
  type DemographicsPosition,
  type CampaignStatus,
  type RegistrationPosition,
  type ReportAccess,
} from '@/utils/assessments/campaign-types'
import {
  RUNNER_FIELD_KEYS,
  compactRunnerOverrides,
  type RunnerOverrideConfig,
  type RunnerSectionKey,
} from '@/components/dashboard/config-editor/runner-config-form'
import { type PreviewTabKey } from '@/components/dashboard/config-editor/contextual-preview'
import { CampaignDangerZone } from './_components/campaign-danger-zone'
import { CampaignExperienceCard } from './_components/campaign-experience-card'
import { CampaignSettingsForm } from './_components/campaign-settings-form'
import { CampaignStatusBar } from './_components/campaign-status-bar'
import { CampaignStatsGrid } from './_components/campaign-stats-grid'
import { CampaignUrlCard } from './_components/campaign-url-card'
import { getPublicCampaignUrl } from '@/utils/public-site-url'
import {
  STATUS_TRANSITIONS,
  asObject,
  getKnownRunnerOverrides,
  hasErrors,
  isValidHref,
  normalizeCampaignSlug,
  type Campaign,
  type Organisation,
} from './_lib/campaign-overview'

type CampaignResponse = {
  campaign?: Campaign
}

type CampaignResponsesResponse = {
  responses?: unknown[]
}

type OrganisationsResponse = {
  organisations?: Organisation[]
}

type MutationResponse = {
  ok?: boolean
  error?: string
}

function buildCampaignConfigSnapshot(input: {
  name: string
  externalName: string
  description: string
  orgId: string
  registrationPosition: RegistrationPosition
  reportAccess: ReportAccess
  demographicsEnabled: boolean
  demographicsPosition: DemographicsPosition
  demographicsFields: DemographicFieldKey[]
  entryLimit: string
}) {
  return {
    name: input.name,
    externalName: input.externalName,
    description: input.description,
    orgId: input.orgId,
    registrationPosition: input.registrationPosition,
    reportAccess: input.reportAccess,
    demographicsEnabled: input.demographicsEnabled,
    demographicsPosition: input.demographicsPosition,
    demographicsFields: input.demographicsFields,
    entryLimit: input.entryLimit,
  }
}

function buildRunnerOverridesSnapshot(input: {
  runnerOverridesEnabled: boolean
  runnerOverrides: RunnerOverrideConfig
  runnerOverridesRaw: Record<string, unknown>
}) {
  return {
    runnerOverridesEnabled: input.runnerOverridesEnabled,
    runnerOverrides: input.runnerOverrides,
    runnerOverridesRaw: input.runnerOverridesRaw,
  }
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
  const [externalName, setExternalName] = useState('')
  const [description, setDescription] = useState('')
  const [orgId, setOrgId] = useState('')
  const [registrationPosition, setRegistrationPosition] = useState<RegistrationPosition>('before')
  const [reportAccess, setReportAccess] = useState<ReportAccess>('immediate')
  const [demographicsEnabled, setDemographicsEnabled] = useState(false)
  const [demographicsPosition, setDemographicsPosition] = useState<DemographicsPosition>('after')
  const [demographicsFields, setDemographicsFields] = useState<DemographicFieldKey[]>([])
  const [entryLimit, setEntryLimit] = useState('')
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSavedAt, setConfigSavedAt] = useState<string | null>(null)
  const configSnapshot = useMemo(
    () =>
      buildCampaignConfigSnapshot({
        name,
        externalName,
        description,
        orgId,
        registrationPosition,
        reportAccess,
        demographicsEnabled,
        demographicsPosition,
        demographicsFields,
        entryLimit,
      }),
    [
      demographicsEnabled,
      demographicsFields,
      demographicsPosition,
      description,
      entryLimit,
      externalName,
      name,
      orgId,
      registrationPosition,
      reportAccess,
    ]
  )
  const overridesSnapshot = useMemo(
    () =>
      buildRunnerOverridesSnapshot({
        runnerOverridesEnabled,
        runnerOverrides,
        runnerOverridesRaw,
      }),
    [runnerOverrides, runnerOverridesEnabled, runnerOverridesRaw]
  )
  const { isDirty: configDirty, markSaved: markConfigSaved } = useUnsavedChanges(configSnapshot, { warnOnUnload: false })
  const { isDirty: overridesDirty, markSaved: markOverridesSaved } = useUnsavedChanges(overridesSnapshot, { warnOnUnload: false })

  useBeforeUnloadWarning(configDirty || overridesDirty)

  const hydrateEditForm = useCallback((nextCampaign: Campaign | null) => {
    if (!nextCampaign) return

    setName(nextCampaign.name)
    setExternalName(nextCampaign.external_name)
    setDescription(nextCampaign.description ?? '')
    setOrgId(nextCampaign.organisation_id ?? '')
    setRegistrationPosition(nextCampaign.config.registration_position)
    setReportAccess(nextCampaign.config.report_access)
    setDemographicsEnabled(nextCampaign.config.demographics_enabled)
    setDemographicsPosition(nextCampaign.config.demographics_position)
    setDemographicsFields(nextCampaign.config.demographics_fields ?? [])
    setEntryLimit(nextCampaign.config.entry_limit ? String(nextCampaign.config.entry_limit) : '')
  }, [])

  const applyCampaignState = useCallback((nextCampaign: Campaign | null) => {
    setCampaign(nextCampaign)

    const rawOverrides = asObject(nextCampaign?.runner_overrides)
    const nextRunnerOverrides = getKnownRunnerOverrides(rawOverrides)
    const nextRunnerOverridesEnabled = Object.keys(rawOverrides).length > 0
    setRunnerOverridesRaw(rawOverrides)
    setRunnerOverrides(nextRunnerOverrides)
    setRunnerOverridesEnabled(nextRunnerOverridesEnabled)

    hydrateEditForm(nextCampaign)
    if (nextCampaign) {
      markConfigSaved(
        buildCampaignConfigSnapshot({
          name: nextCampaign.name,
          externalName: nextCampaign.external_name,
          description: nextCampaign.description ?? '',
          orgId: nextCampaign.organisation_id ?? '',
          registrationPosition: nextCampaign.config.registration_position,
          reportAccess: nextCampaign.config.report_access,
          demographicsEnabled: nextCampaign.config.demographics_enabled,
          demographicsPosition: nextCampaign.config.demographics_position,
          demographicsFields: nextCampaign.config.demographics_fields ?? [],
          entryLimit: nextCampaign.config.entry_limit ? String(nextCampaign.config.entry_limit) : '',
        })
      )
      markOverridesSaved(
        buildRunnerOverridesSnapshot({
          runnerOverridesEnabled: nextRunnerOverridesEnabled,
          runnerOverrides: nextRunnerOverrides,
          runnerOverridesRaw: rawOverrides,
        })
      )
    }
  }, [hydrateEditForm, markConfigSaved, markOverridesSaved])

  const reloadCampaign = useCallback(async () => {
    const [campaignResponse, responsesResponse] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
    ])

    const campaignBody = (await campaignResponse.json()) as CampaignResponse
    const nextCampaign = campaignBody.campaign ?? null
    applyCampaignState(nextCampaign)

    if (responsesResponse.ok) {
      const responsesBody = (await responsesResponse.json()) as CampaignResponsesResponse
      setResponseCount(responsesBody.responses?.length ?? 0)
    }

    setLoading(false)
  }, [applyCampaignState, campaignId])

  useEffect(() => {
    let active = true

    async function loadCampaignWorkspace() {
      setLoading(true)

      const [campaignResponse, responsesResponse, organisationsResponse] = await Promise.all([
        fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
        fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
        fetch('/api/admin/organisations?pageSize=200', { cache: 'no-store' }),
      ])

      const campaignBody = (await campaignResponse.json()) as CampaignResponse
      const responsesBody = responsesResponse.ok
        ? ((await responsesResponse.json()) as CampaignResponsesResponse)
        : { responses: [] }
      const organisationsBody = (await organisationsResponse.json().catch(() => null)) as OrganisationsResponse | null

      if (!active) return

      applyCampaignState(campaignBody.campaign ?? null)
      setResponseCount(responsesBody.responses?.length ?? 0)
      setOrganisations(organisationsBody?.organisations ?? [])
      setLoading(false)
    }

    void loadCampaignWorkspace()

    return () => {
      active = false
    }
  }, [applyCampaignState, campaignId])

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
    setDemographicsFields((prev) =>
      prev.includes(field as DemographicFieldKey)
        ? prev.filter((item) => item !== field)
        : [...prev, field as DemographicFieldKey]
    )
  }

  function handleExternalNameChange(value: string) {
    setExternalName(value)
  }

  async function saveCampaignConfig() {
    setConfigSaving(true)
    setConfigError(null)
    setConfigSavedAt(null)

    try {
      const derivedSlug = normalizeCampaignSlug(externalName)

      if (!derivedSlug) {
        setConfigError('External name must include letters or numbers so we can generate a public URL.')
        return
      }

      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          external_name: externalName.trim(),
          description: description.trim() || null,
          organisation_id: orgId || null,
          config: {
            registration_position: registrationPosition,
            report_access: reportAccess,
            demographics_enabled: demographicsEnabled,
            demographics_position: demographicsPosition,
            demographics_fields: demographicsEnabled ? demographicsFields : [],
            entry_limit: Number.isFinite(Number(entryLimit)) && Number(entryLimit) >= 1 ? Math.floor(Number(entryLimit)) : null,
          },
        }),
      })
      const body = (await response.json().catch(() => null)) as MutationResponse | null
      if (!response.ok || !body?.ok) {
        if (body?.error === 'slug_taken') {
          setConfigError('That slug is already in use for this campaign scope.')
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
    overrideErrors.completion_screen_cta_href =
      'Completion CTA link must be a valid URL or relative path.'
  }

  const overrideValidationFailed =
    runnerOverridesEnabled && hasErrors(overrideErrors as Record<string, string | undefined>)

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
      const body = (await response.json().catch(() => null)) as MutationResponse | null
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

  const publicSlug =
    normalizeCampaignSlug(externalName)
    || normalizeCampaignSlug(campaign.external_name)
    || campaign.slug
  const selectedOrganisationSlug =
    organisations.find((organisation) => organisation.id === orgId)?.slug
    ?? campaign.organisations?.slug
  const campaignUrl = getPublicCampaignUrl(publicSlug, selectedOrganisationSlug)
  const activeAssessments = campaign.campaign_assessments.filter((assessment) => assessment.is_active).length
  const transitions = STATUS_TRANSITIONS[campaign.status] ?? []
  const previewAssessment =
    campaign.campaign_assessments
      .filter((assessment) => assessment.is_active && assessment.assessments)
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))[0]
      ?.assessments ?? null
  const previewRunner = resolveCampaignRunnerConfig(
    previewAssessment?.runner_config ?? DEFAULT_RUNNER_CONFIG,
    runnerOverridesEnabled ? compactRunnerOverrides(runnerOverrides) : {},
    {
      campaignName: campaign.external_name,
      organisationName: campaign.organisations?.name ?? null,
      assessmentName: previewAssessment?.external_name ?? null,
    }
  )
  const inviteAssessments = campaign.campaign_assessments
    .filter((assessment) => assessment.assessments)
    .map((assessment) => ({ id: assessment.assessment_id, name: assessment.assessments!.name }))
  const createdAt = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(campaign.created_at))

  async function deleteCampaign() {
    if (!campaign || deleteConfirmName !== campaign.name) return

    setDeleting(true)
    setDeleteError(null)

    const response = await fetch(`/api/admin/campaigns/${campaignId}`, { method: 'DELETE' })
    const body = (await response.json().catch(() => null)) as MutationResponse | null
    setDeleting(false)
    if (!response.ok) {
      if (body?.error === 'campaign_has_activity') {
        setDeleteError('Campaigns with invitations or submissions cannot be deleted. Archive or close this one instead.')
        return
      }
      setDeleteError('Failed to delete campaign.')
      return
    }

    router.push('/dashboard/campaigns')
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title={campaign.name}
        description="Run the live campaign, keep the public-facing basics clean, and move the deeper controls into advanced sections."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/campaigns/${campaignId}/flow`} className="foundation-btn foundation-btn-primary foundation-btn-md">
              Open flow builder
            </Link>
            <Link href={`/dashboard/campaigns/${campaignId}/responses`} className="foundation-btn foundation-btn-secondary foundation-btn-md">
              Open responses
            </Link>
          </div>
        )}
      />

      <CampaignStatusBar
        status={campaign.status}
        transitions={transitions}
        saving={saving}
        assessments={inviteAssessments}
        onSetStatus={setStatus}
        onInvited={reloadCampaign}
      />

      <CampaignStatsGrid
        campaignId={campaignId}
        activeAssessments={activeAssessments}
        organisationName={campaign.organisations?.name ?? 'Public'}
        registrationPosition={campaign.config.registration_position}
        responseCount={responseCount}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.85fr)]">
        <CampaignSettingsForm
          name={name}
          externalName={externalName}
          description={description}
          slug={publicSlug}
          orgId={orgId}
          organisations={organisations}
          registrationPosition={registrationPosition}
          reportAccess={reportAccess}
          demographicsEnabled={demographicsEnabled}
          demographicsPosition={demographicsPosition}
          demographicsFields={demographicsFields}
          entryLimit={entryLimit}
          configSaving={configSaving}
          configDirty={configDirty}
          configError={configError}
          configSavedAt={configSavedAt}
          onNameChange={setName}
          onExternalNameChange={handleExternalNameChange}
          onDescriptionChange={setDescription}
          onOrgIdChange={setOrgId}
          onRegistrationPositionChange={setRegistrationPosition}
          onReportAccessChange={setReportAccess}
          onDemographicsEnabledChange={setDemographicsEnabled}
          onDemographicsPositionChange={setDemographicsPosition}
          onEntryLimitChange={setEntryLimit}
          onToggleDemographicsField={toggleDemographicsField}
          onSave={saveCampaignConfig}
        />

        <div className="space-y-6">
          <CampaignUrlCard campaignUrl={campaignUrl} />

          <FoundationSurface className="space-y-3 p-6">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Campaign summary</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">
              {[campaign.organisations?.name ?? 'Leadership Quarter', createdAt].filter(Boolean).join(' · ')}
            </p>
            <p className="text-sm text-[var(--admin-text-muted)]">
              Report access: {campaign.config.report_access} · Demographics: {campaign.config.demographics_enabled ? 'On' : 'Off'}
            </p>
          </FoundationSurface>
        </div>
      </div>

      <details className="group rounded-[1.75rem] border border-[rgba(103,127,159,0.14)] bg-white/72 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-[1.5rem] px-4 py-3 text-sm font-semibold text-[var(--admin-text-primary)]">
          Advanced settings
          <span className="text-xs font-medium text-[var(--admin-text-muted)] group-open:hidden">Expand</span>
          <span className="hidden text-xs font-medium text-[var(--admin-text-muted)] group-open:inline">Collapse</span>
        </summary>
        <div className="space-y-6 px-2 pb-2 pt-4">
          <CampaignExperienceCard
            runnerOverridesEnabled={runnerOverridesEnabled}
            activeOverrideSection={activeOverrideSection}
            expandOverrideSections={expandOverrideSections}
            overridePreviewTab={overridePreviewTab}
            runnerOverrides={runnerOverrides}
            overrideErrors={overrideErrors}
            overrideValidationFailed={overrideValidationFailed}
            previewRunner={previewRunner}
            overridesError={overridesError}
            overridesDirty={overridesDirty}
            overridesSavedAt={overridesSavedAt}
            overridesSaving={overridesSaving}
            onRunnerOverridesEnabledChange={setRunnerOverridesEnabled}
            onActiveOverrideSectionChange={setActiveOverrideSection}
            onExpandOverrideSectionsChange={setExpandOverrideSections}
            onOverridePreviewTabChange={setOverridePreviewTab}
            onRunnerOverridesChange={setRunnerOverrides}
            onSave={saveRunnerOverrides}
          />

          {campaign.status === 'archived' ? (
            <CampaignDangerZone
              campaignName={campaign.name}
              showDeleteConfirm={showDeleteConfirm}
              deleteConfirmName={deleteConfirmName}
              deleting={deleting}
              deleteError={deleteError}
              onShowDeleteConfirm={() => setShowDeleteConfirm(true)}
              onDeleteConfirmNameChange={setDeleteConfirmName}
              onDelete={deleteCampaign}
              onCancel={() => {
                setShowDeleteConfirm(false)
                setDeleteConfirmName('')
              }}
            />
          ) : null}
        </div>
      </details>
    </DashboardPageShell>
  )
}
