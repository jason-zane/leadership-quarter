'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAutoSave } from '@/components/dashboard/hooks/use-auto-save'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { validateHexColor } from '@/utils/brand/org-brand-utils'
import {
  type CampaignBrandingMode,
  type DemographicFieldKey,
  type DemographicsPosition,
  type LqBrandingVariant,
  normalizeCampaignConfig,
  type RegistrationPosition,
  type ReportAccess,
} from '@/utils/assessments/campaign-types'
import { CampaignDangerZone } from '../_components/campaign-danger-zone'
import { CampaignSettingsForm } from '../_components/campaign-settings-form'
import {
  normalizeCampaignSlug,
  type Campaign,
  type Organisation,
} from '../_lib/campaign-overview'

type CampaignResponse = {
  campaign?: Campaign
}

type OrganisationsResponse = {
  organisations?: Organisation[]
}

type MutationResponse = {
  ok?: boolean
  error?: string
}

function buildSnapshot(input: {
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
  brandingMode: CampaignBrandingMode
  brandingSourceOrganisationId: string
  brandingLogoUrl: string
  brandingCompanyName: string
  brandingShowAttribution: boolean
  brandingPrimaryColor: string
  brandingSecondaryColor: string
  brandingSurfaceTintColor: string
}) {
  return { ...input }
}

export default function CampaignSettingsPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)

  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [externalName, setExternalName] = useState('')
  const [description, setDescription] = useState('')
  const [orgId, setOrgId] = useState('')
  const [registrationPosition, setRegistrationPosition] = useState<RegistrationPosition>('before')
  const [reportAccess, setReportAccess] = useState<ReportAccess>('immediate')
  const [reportOptions, setReportOptions] = useState<Array<{ id: string; name: string; assessmentName: string }>>([])
  const [selectedReportId, setSelectedReportId] = useState('')
  const [demographicsEnabled, setDemographicsEnabled] = useState(false)
  const [demographicsPosition, setDemographicsPosition] = useState<DemographicsPosition>('after')
  const [demographicsFields, setDemographicsFields] = useState<DemographicFieldKey[]>([])
  const [entryLimit, setEntryLimit] = useState('')
  const [brandingMode, setBrandingMode] = useState<CampaignBrandingMode>('lq')
  const [brandingLqVariant, setBrandingLqVariant] = useState<LqBrandingVariant | null>(null)
  const [brandingSourceOrganisationId, setBrandingSourceOrganisationId] = useState('')
  const [brandingLogoUrl, setBrandingLogoUrl] = useState('')
  const [brandingCompanyName, setBrandingCompanyName] = useState('')
  const [brandingShowAttribution, setBrandingShowAttribution] = useState(true)
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState('')
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState('')
  const [brandingSurfaceTintColor, setBrandingSurfaceTintColor] = useState('')
  const [brandingLogoPreview, setBrandingLogoPreview] = useState<string | null>(null)
  const [pendingBrandingFile, setPendingBrandingFile] = useState<File | null>(null)
  const pendingBrandingFileRef = useRef<File | null>(null)
  pendingBrandingFileRef.current = pendingBrandingFile
  const brandingFileInputRef = useRef<HTMLInputElement>(null)

  const configSnapshot = useMemo(
    () =>
      buildSnapshot({
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
        brandingMode,
        brandingSourceOrganisationId,
        brandingLogoUrl,
        brandingCompanyName,
        brandingShowAttribution,
        brandingPrimaryColor,
        brandingSecondaryColor,
        brandingSurfaceTintColor,
      }),
    [
      brandingCompanyName, brandingLogoUrl, brandingMode, brandingShowAttribution, brandingSourceOrganisationId,
      brandingPrimaryColor, brandingSecondaryColor, brandingSurfaceTintColor,
      demographicsEnabled, demographicsFields, demographicsPosition,
      description, entryLimit, externalName, name, orgId,
      registrationPosition, reportAccess,
    ]
  )

  const hydrateForm = useCallback((c: Campaign) => {
    setName(c.name)
    setExternalName(c.external_name)
    setDescription(c.description ?? '')
    setOrgId(c.organisation_id ?? '')
    setRegistrationPosition(c.config.registration_position)
    setReportAccess(c.config.report_access)
    setDemographicsEnabled(c.config.demographics_enabled)
    setDemographicsPosition(c.config.demographics_position)
    setDemographicsFields(c.config.demographics_fields ?? [])
    setEntryLimit(c.config.entry_limit ? String(c.config.entry_limit) : '')
    setBrandingMode(c.config.branding_mode)
    setBrandingLqVariant(c.config.branding_lq_variant)
    setBrandingSourceOrganisationId(c.config.branding_source_organisation_id ?? c.organisation_id ?? '')
    setBrandingLogoUrl(c.config.branding_logo_url ?? '')
    setBrandingCompanyName(c.config.branding_company_name ?? '')
    setBrandingShowAttribution(c.config.branding_show_lq_attribution ?? true)
    setBrandingPrimaryColor(c.config.branding_primary_color ?? '')
    setBrandingSecondaryColor(c.config.branding_secondary_color ?? '')
    setBrandingSurfaceTintColor(c.config.branding_surface_tint_color ?? '')
    setBrandingLogoPreview(c.config.branding_logo_url ?? null)
    setPendingBrandingFile(null)
    if (brandingFileInputRef.current) brandingFileInputRef.current.value = ''
  }, [])

  const validate = useCallback((data: ReturnType<typeof buildSnapshot>) => {
    const slug = normalizeCampaignSlug(data.externalName)
    if (!slug) return 'External name must include letters or numbers so we can generate a public URL.'
    const pc = data.brandingPrimaryColor.trim()
    const sc = data.brandingSecondaryColor.trim()
    const st = data.brandingSurfaceTintColor.trim()
    if (pc && !validateHexColor(pc)) return 'Primary colour must be a valid hex value (e.g. #1a3a6b).'
    if (sc && !validateHexColor(sc)) return 'Secondary colour must be a valid hex value (e.g. #d9b46d).'
    if (st && !validateHexColor(st)) return 'Surface tint must be a valid hex value (e.g. #eef2f8).'
    return null
  }, [])

  const onSave = useCallback(async (data: ReturnType<typeof buildSnapshot>) => {
    let resolvedLogoUrl = data.brandingLogoUrl.trim() || null
    const file = pendingBrandingFileRef.current
    if (file) {
      const fd = new FormData()
      fd.append('file', file)
      const uploadRes = await fetch(`/api/admin/campaigns/${campaignId}/assets`, {
        method: 'POST',
        body: fd,
      })
      const uploadBody = (await uploadRes.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null
      if (!uploadRes.ok || !uploadBody?.ok || !uploadBody.url) {
        throw new Error(uploadBody?.error ?? 'Logo upload failed.')
      }
      resolvedLogoUrl = uploadBody.url
    }

    const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name.trim(),
        external_name: data.externalName.trim(),
        description: data.description.trim() || null,
        organisation_id: data.orgId || null,
        config: {
          registration_position: data.registrationPosition,
          report_access: data.reportAccess,
          demographics_enabled: data.demographicsEnabled,
          demographics_position: data.demographicsPosition,
          demographics_fields: data.demographicsEnabled ? data.demographicsFields : [],
          entry_limit: Number.isFinite(Number(data.entryLimit)) && Number(data.entryLimit) >= 1 ? Math.floor(Number(data.entryLimit)) : null,
          branding_mode: data.brandingMode,
          branding_lq_variant: brandingLqVariant,
          branding_source_organisation_id: data.brandingSourceOrganisationId || null,
          branding_logo_url: resolvedLogoUrl,
          branding_company_name: data.brandingCompanyName.trim() || null,
          branding_show_lq_attribution: data.brandingShowAttribution,
          branding_primary_color: data.brandingPrimaryColor.trim() || null,
          branding_secondary_color: data.brandingSecondaryColor.trim() || null,
          branding_surface_tint_color: data.brandingSurfaceTintColor.trim() || null,
        },
      }),
    })
    const body = (await response.json().catch(() => null)) as MutationResponse | null
    if (!response.ok || !body?.ok) {
      if (body?.error === 'slug_taken') throw new Error('That slug is already in use for this campaign scope.')
      if (body?.error === 'invalid_slug') throw new Error('Slug must contain only lowercase letters, numbers, and dashes.')
      throw new Error(body?.error ?? 'Failed to save campaign configuration.')
    }

    setPendingBrandingFile(null)
    setBrandingLogoUrl(resolvedLogoUrl ?? '')
    setBrandingLogoPreview(resolvedLogoUrl)

    const refreshRes = await fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' })
    const refreshBody = (await refreshRes.json()) as CampaignResponse
    if (refreshBody.campaign) {
      setCampaign(refreshBody.campaign)
      hydrateForm(refreshBody.campaign)
    }
  }, [campaignId, brandingLqVariant, hydrateForm])

  const { status: autoSaveStatus, error: autoSaveError, savedAt: autoSaveSavedAt, saveNow, markSaved: markConfigSaved } = useAutoSave({
    data: configSnapshot,
    onSave,
    validate,
    debounceMs: 800,
  })

  const applyCampaignState = useCallback((c: Campaign | null) => {
    setCampaign(c)
    if (!c) return
    hydrateForm(c)
    markConfigSaved(
      buildSnapshot({
        name: c.name,
        externalName: c.external_name,
        description: c.description ?? '',
        orgId: c.organisation_id ?? '',
        registrationPosition: c.config.registration_position,
        reportAccess: c.config.report_access,
        demographicsEnabled: c.config.demographics_enabled,
        demographicsPosition: c.config.demographics_position,
        demographicsFields: c.config.demographics_fields ?? [],
        entryLimit: c.config.entry_limit ? String(c.config.entry_limit) : '',
        brandingMode: c.config.branding_mode,
        brandingSourceOrganisationId: c.config.branding_source_organisation_id ?? c.organisation_id ?? '',
        brandingLogoUrl: c.config.branding_logo_url ?? '',
        brandingCompanyName: c.config.branding_company_name ?? '',
        brandingShowAttribution: c.config.branding_show_lq_attribution ?? true,
        brandingPrimaryColor: c.config.branding_primary_color ?? '',
        brandingSecondaryColor: c.config.branding_secondary_color ?? '',
        brandingSurfaceTintColor: c.config.branding_surface_tint_color ?? '',
      })
    )
  }, [hydrateForm, markConfigSaved])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const [campaignRes, orgsRes] = await Promise.all([
        fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
        fetch('/api/admin/organisations?pageSize=200', { cache: 'no-store' }),
      ])
      const campaignBody = (await campaignRes.json()) as CampaignResponse
      const orgsBody = (await orgsRes.json().catch(() => null)) as OrganisationsResponse | null
      if (!active) return
      applyCampaignState(campaignBody.campaign ?? null)
      setOrganisations(orgsBody?.organisations ?? [])

      const activeAssessments = (campaignBody.campaign?.campaign_assessments ?? []).filter((ca) => ca.is_active && ca.assessments)
      const reportResults = await Promise.all(
        activeAssessments.map(async (ca) => {
          const res = await fetch(`/api/admin/assessments/${ca.assessment_id}/reports`, { cache: 'no-store' })
          const body = (await res.json().catch(() => null)) as {
            ok?: boolean
            reports?: Array<{ id: string; name: string; reportKind: string; status: string }>
          } | null
          if (!res.ok || !body?.ok) return []
          return (body.reports ?? [])
            .filter((r) => r.reportKind === 'audience' && r.status === 'published')
            .map((r) => ({
              id: r.id,
              name: r.name,
              assessmentName: ca.assessments?.external_name ?? ca.assessments?.name ?? 'Assessment',
            }))
        })
      )
      if (!active) return
      setReportOptions(reportResults.flat())

      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [applyCampaignState, campaignId])

  function toggleDemographicsField(field: string) {
    setDemographicsFields((prev) =>
      prev.includes(field as DemographicFieldKey)
        ? prev.filter((item) => item !== field)
        : [...prev, field as DemographicFieldKey]
    )
  }

  function handleBrandingFileChange(file: File | null) {
    if (!file) return
    setPendingBrandingFile(file)
    setBrandingLogoPreview(URL.createObjectURL(file))
  }

  function handleBrandingLogoUrlChange(value: string) {
    setBrandingLogoUrl(value)
    if (!pendingBrandingFile) {
      setBrandingLogoPreview(value.trim() || null)
    }
  }

  function handleBrandingRemoveLogo() {
    setPendingBrandingFile(null)
    setBrandingLogoPreview(null)
    setBrandingLogoUrl('')
    if (brandingFileInputRef.current) brandingFileInputRef.current.value = ''
  }

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
    window.location.href = '/dashboard/campaigns'
  }

  const publicSlug =
    normalizeCampaignSlug(externalName)
    || (campaign ? normalizeCampaignSlug(campaign.external_name) : '')
    || campaign?.slug
    || ''
  if (loading) {
    return <p className="text-sm text-zinc-400">Loading...</p>
  }

  if (!campaign) {
    return <p className="text-sm text-red-500">Campaign not found.</p>
  }

  const previewCampaignConfig = normalizeCampaignConfig({
    ...campaign.config,
    registration_position: registrationPosition,
    report_access: reportAccess,
    demographics_enabled: demographicsEnabled,
    demographics_position: demographicsPosition,
    demographics_fields: demographicsFields,
    entry_limit: Number.isFinite(Number(entryLimit)) && Number(entryLimit) >= 1 ? Math.floor(Number(entryLimit)) : null,
    branding_mode: brandingMode,
    branding_lq_variant: brandingLqVariant,
    branding_source_organisation_id: brandingSourceOrganisationId || null,
    branding_logo_url: brandingLogoUrl.trim() || null,
    branding_company_name: brandingCompanyName.trim() || null,
    branding_show_lq_attribution: brandingShowAttribution,
    branding_primary_color: brandingPrimaryColor.trim() || null,
    branding_secondary_color: brandingSecondaryColor.trim() || null,
    branding_surface_tint_color: brandingSurfaceTintColor.trim() || null,
  })
  const selectedBrandSourceOrganisation =
    organisations.find((organisation) => organisation.id === brandingSourceOrganisationId)
    ?? campaign.branding_source_organisation
    ?? (campaign.organisations?.id === brandingSourceOrganisationId || !brandingSourceOrganisationId
      ? campaign.organisations
      : null)

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaign settings"
        title={campaign.name}
        description="Configure campaign identity, audience rules, and how this campaign applies a shared client brand."
      />

      <CampaignSettingsForm
        name={name}
        externalName={externalName}
        description={description}
        slug={publicSlug}
        orgId={orgId}
        organisations={organisations}
        registrationPosition={registrationPosition}
        reportAccess={reportAccess}
        reportOptions={reportOptions}
        selectedReportId={selectedReportId}
        demographicsEnabled={demographicsEnabled}
        demographicsPosition={demographicsPosition}
        demographicsFields={demographicsFields}
        entryLimit={entryLimit}
        brandingMode={brandingMode}
        brandingLqVariant={brandingLqVariant}
        brandingSourceOrganisationId={brandingSourceOrganisationId}
        brandingLogoUrl={brandingLogoUrl}
        brandingLogoPreview={brandingLogoPreview}
        brandingCompanyName={brandingCompanyName}
        brandingShowAttribution={brandingShowAttribution}
        previewCampaignConfig={previewCampaignConfig}
        previewOrganisationName={selectedBrandSourceOrganisation?.name ?? campaign.organisations?.name ?? null}
        previewOrganisationBrandingConfig={selectedBrandSourceOrganisation?.branding_config ?? null}
        brandingFileInputRef={brandingFileInputRef}
        autoSaveStatus={autoSaveStatus}
        autoSaveError={autoSaveError}
        autoSaveSavedAt={autoSaveSavedAt}
        onRetrySave={() => void saveNow()}
        onNameChange={setName}
        onExternalNameChange={setExternalName}
        onDescriptionChange={setDescription}
        onOrgIdChange={setOrgId}
        onRegistrationPositionChange={setRegistrationPosition}
        onReportAccessChange={setReportAccess}
        onReportChange={setSelectedReportId}
        onDemographicsEnabledChange={setDemographicsEnabled}
        onDemographicsPositionChange={setDemographicsPosition}
        onEntryLimitChange={setEntryLimit}
        onToggleDemographicsField={toggleDemographicsField}
        onBrandingModeChange={setBrandingMode}
        onBrandingLqVariantChange={setBrandingLqVariant}
        onBrandingSourceOrganisationIdChange={setBrandingSourceOrganisationId}
        onBrandingLogoUrlChange={handleBrandingLogoUrlChange}
        onBrandingCompanyNameChange={setBrandingCompanyName}
        onBrandingShowAttributionChange={setBrandingShowAttribution}
        brandingPrimaryColor={brandingPrimaryColor}
        brandingSecondaryColor={brandingSecondaryColor}
        brandingSurfaceTintColor={brandingSurfaceTintColor}
        onBrandingPrimaryColorChange={setBrandingPrimaryColor}
        onBrandingSecondaryColorChange={setBrandingSecondaryColor}
        onBrandingSurfaceTintColorChange={setBrandingSurfaceTintColor}
        onBrandingFileChange={handleBrandingFileChange}
        onBrandingRemoveLogo={handleBrandingRemoveLogo}
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
    </DashboardPageShell>
  )
}
