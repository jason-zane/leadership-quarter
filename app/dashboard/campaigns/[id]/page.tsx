'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  DEFAULT_RUNNER_CONFIG,
  resolveCampaignRunnerConfig,
} from '@/utils/assessments/experience-config'
import {
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
import { CampaignSummaryCard } from './_components/campaign-summary-card'
import { CampaignUrlCard } from './_components/campaign-url-card'
import {
  STATUS_TRANSITIONS,
  asObject,
  getKnownRunnerOverrides,
  getSiteUrl,
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
  const [slug, setSlug] = useState('')
  const [orgId, setOrgId] = useState('')
  const [registrationPosition, setRegistrationPosition] = useState<RegistrationPosition>('before')
  const [reportAccess, setReportAccess] = useState<ReportAccess>('immediate')
  const [demographicsEnabled, setDemographicsEnabled] = useState(false)
  const [demographicsFields, setDemographicsFields] = useState<string[]>([])
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSavedAt, setConfigSavedAt] = useState<string | null>(null)

  const hydrateEditForm = useCallback((nextCampaign: Campaign | null) => {
    if (!nextCampaign) return

    setName(nextCampaign.name)
    setExternalName(nextCampaign.external_name)
    setSlug(nextCampaign.slug)
    setOrgId(nextCampaign.organisation_id ?? '')
    setRegistrationPosition(nextCampaign.config.registration_position)
    setReportAccess(nextCampaign.config.report_access)
    setDemographicsEnabled(nextCampaign.config.demographics_enabled)
    setDemographicsFields(nextCampaign.config.demographics_fields ?? [])
  }, [])

  const applyCampaignState = useCallback((nextCampaign: Campaign | null) => {
    setCampaign(nextCampaign)

    const rawOverrides = asObject(nextCampaign?.runner_overrides)
    setRunnerOverridesRaw(rawOverrides)
    setRunnerOverrides(getKnownRunnerOverrides(rawOverrides))
    setRunnerOverridesEnabled(Object.keys(rawOverrides).length > 0)

    hydrateEditForm(nextCampaign)
  }, [hydrateEditForm])

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
      prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]
    )
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
          external_name: externalName.trim(),
          slug: normalizeCampaignSlug(slug),
          organisation_id: orgId || null,
          config: {
            registration_position: registrationPosition,
            report_access: reportAccess,
            demographics_enabled: demographicsEnabled,
            demographics_fields: demographicsEnabled ? demographicsFields : [],
          },
        }),
      })
      const body = (await response.json().catch(() => null)) as MutationResponse | null
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

  const campaignUrl = `${getSiteUrl()}/assess/c/${campaign.slug}`
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
    setDeleting(false)
    if (!response.ok) {
      setDeleteError('Failed to delete campaign.')
      return
    }

    router.push('/dashboard/campaigns')
  }

  return (
    <div className="space-y-6">
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

      <CampaignUrlCard campaignUrl={campaignUrl} />

      <CampaignSettingsForm
        name={name}
        externalName={externalName}
        slug={slug}
        orgId={orgId}
        organisations={organisations}
        registrationPosition={registrationPosition}
        reportAccess={reportAccess}
        demographicsEnabled={demographicsEnabled}
        demographicsFields={demographicsFields}
        configSaving={configSaving}
        configError={configError}
        configSavedAt={configSavedAt}
        onNameChange={setName}
        onExternalNameChange={setExternalName}
        onSlugChange={setSlug}
        onOrgIdChange={setOrgId}
        onRegistrationPositionChange={setRegistrationPosition}
        onReportAccessChange={setReportAccess}
        onDemographicsEnabledChange={setDemographicsEnabled}
        onToggleDemographicsField={toggleDemographicsField}
        onSave={saveCampaignConfig}
      />

      <CampaignSummaryCard
        reportAccess={campaign.config.report_access}
        demographicsEnabled={campaign.config.demographics_enabled}
        createdAt={createdAt}
      />

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
        overridesSavedAt={overridesSavedAt}
        overridesSaving={overridesSaving}
        onRunnerOverridesEnabledChange={setRunnerOverridesEnabled}
        onActiveOverrideSectionChange={setActiveOverrideSection}
        onExpandOverrideSectionsChange={setExpandOverrideSections}
        onOverridePreviewTabChange={setOverridePreviewTab}
        onRunnerOverridesChange={setRunnerOverrides}
        onSave={saveRunnerOverrides}
      />

      {campaign.status === 'archived' && (
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
      )}
    </div>
  )
}
