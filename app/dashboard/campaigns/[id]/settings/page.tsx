'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useBeforeUnloadWarning, useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { validateHexColor } from '@/utils/brand/org-brand-utils'
import {
  type CampaignBrandingMode,
  type DemographicFieldKey,
  type DemographicsPosition,
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
  brandingLogoUrl: string
  brandingCompanyName: string
  brandingPrimaryColor: string
  brandingSecondaryColor: string
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
  const [demographicsEnabled, setDemographicsEnabled] = useState(false)
  const [demographicsPosition, setDemographicsPosition] = useState<DemographicsPosition>('after')
  const [demographicsFields, setDemographicsFields] = useState<DemographicFieldKey[]>([])
  const [entryLimit, setEntryLimit] = useState('')
  const [brandingMode, setBrandingMode] = useState<CampaignBrandingMode>('lq')
  const [brandingLogoUrl, setBrandingLogoUrl] = useState('')
  const [brandingCompanyName, setBrandingCompanyName] = useState('')
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState('')
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState('')
  const [brandingLogoPreview, setBrandingLogoPreview] = useState<string | null>(null)
  const [pendingBrandingFile, setPendingBrandingFile] = useState<File | null>(null)
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSavedAt, setConfigSavedAt] = useState<string | null>(null)
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
        brandingLogoUrl,
        brandingCompanyName,
        brandingPrimaryColor,
        brandingSecondaryColor,
      }),
    [
      brandingCompanyName, brandingLogoUrl, brandingMode, brandingPrimaryColor, brandingSecondaryColor,
      demographicsEnabled, demographicsFields, demographicsPosition,
      description, entryLimit, externalName, name, orgId,
      registrationPosition, reportAccess,
    ]
  )
  const { isDirty: configDirty, markSaved: markConfigSaved } = useUnsavedChanges(configSnapshot, { warnOnUnload: false })
  useBeforeUnloadWarning(configDirty)

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
    setBrandingLogoUrl(c.config.branding_logo_url ?? '')
    setBrandingCompanyName(c.config.branding_company_name ?? '')
    setBrandingPrimaryColor(c.config.branding_primary_color ?? '')
    setBrandingSecondaryColor(c.config.branding_secondary_color ?? '')
    setBrandingLogoPreview(c.config.branding_logo_url ?? null)
    setPendingBrandingFile(null)
    if (brandingFileInputRef.current) brandingFileInputRef.current.value = ''
  }, [])

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
        brandingLogoUrl: c.config.branding_logo_url ?? '',
        brandingCompanyName: c.config.branding_company_name ?? '',
        brandingPrimaryColor: c.config.branding_primary_color ?? '',
        brandingSecondaryColor: c.config.branding_secondary_color ?? '',
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

      const trimmedPrimaryColor = brandingPrimaryColor.trim()
      const trimmedSecondaryColor = brandingSecondaryColor.trim()
      if (trimmedPrimaryColor && !validateHexColor(trimmedPrimaryColor)) {
        setConfigError('Primary colour must be a valid hex value (e.g. #1a3a6b).')
        return
      }
      if (trimmedSecondaryColor && !validateHexColor(trimmedSecondaryColor)) {
        setConfigError('Secondary colour must be a valid hex value (e.g. #d9b46d).')
        return
      }

      let resolvedLogoUrl = brandingLogoUrl.trim() || null
      if (pendingBrandingFile) {
        const fd = new FormData()
        fd.append('file', pendingBrandingFile)
        const uploadRes = await fetch(`/api/admin/campaigns/${campaignId}/assets`, {
          method: 'POST',
          body: fd,
        })
        const uploadBody = (await uploadRes.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null
        if (!uploadRes.ok || !uploadBody?.ok || !uploadBody.url) {
          setConfigError(uploadBody?.error ?? 'Logo upload failed.')
          return
        }
        resolvedLogoUrl = uploadBody.url
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
            branding_mode: brandingMode,
            branding_logo_url: resolvedLogoUrl,
            branding_company_name: brandingCompanyName.trim() || null,
            branding_primary_color: trimmedPrimaryColor || null,
            branding_secondary_color: trimmedSecondaryColor || null,
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

      setPendingBrandingFile(null)
      setBrandingLogoUrl(resolvedLogoUrl ?? '')
      setBrandingLogoPreview(resolvedLogoUrl)
      setConfigSavedAt(new Date().toLocaleTimeString())

      const refreshRes = await fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' })
      const refreshBody = (await refreshRes.json()) as CampaignResponse
      applyCampaignState(refreshBody.campaign ?? null)
    } finally {
      setConfigSaving(false)
    }
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

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaign settings"
        title={campaign.name}
        description="Configure the campaign identity, registration, demographics, branding, and other options."
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
        demographicsEnabled={demographicsEnabled}
        demographicsPosition={demographicsPosition}
        demographicsFields={demographicsFields}
        entryLimit={entryLimit}
        brandingMode={brandingMode}
        brandingLogoUrl={brandingLogoUrl}
        brandingLogoPreview={brandingLogoPreview}
        brandingCompanyName={brandingCompanyName}
        brandingPrimaryColor={brandingPrimaryColor}
        brandingSecondaryColor={brandingSecondaryColor}
        brandingFileInputRef={brandingFileInputRef}
        configSaving={configSaving}
        configDirty={configDirty}
        configError={configError}
        configSavedAt={configSavedAt}
        onNameChange={setName}
        onExternalNameChange={setExternalName}
        onDescriptionChange={setDescription}
        onOrgIdChange={setOrgId}
        onRegistrationPositionChange={setRegistrationPosition}
        onReportAccessChange={setReportAccess}
        onDemographicsEnabledChange={setDemographicsEnabled}
        onDemographicsPositionChange={setDemographicsPosition}
        onEntryLimitChange={setEntryLimit}
        onToggleDemographicsField={toggleDemographicsField}
        onBrandingModeChange={setBrandingMode}
        onBrandingLogoUrlChange={handleBrandingLogoUrlChange}
        onBrandingCompanyNameChange={setBrandingCompanyName}
        onBrandingPrimaryColorChange={setBrandingPrimaryColor}
        onBrandingSecondaryColorChange={setBrandingSecondaryColor}
        onBrandingFileChange={handleBrandingFileChange}
        onBrandingRemoveLogo={handleBrandingRemoveLogo}
        onSave={saveCampaignConfig}
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
