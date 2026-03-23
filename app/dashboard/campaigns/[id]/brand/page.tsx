'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import {
  type CampaignBrandingMode,
  normalizeCampaignConfig,
} from '@/utils/assessments/campaign-types'
import { normalizeOrgBrandingConfig, type OrgBrandingConfig } from '@/utils/brand/org-brand-utils'
import { CampaignBrandForm, deriveUiMode } from '../_components/campaign-brand-form'
import type { Campaign, Organisation } from '../_lib/campaign-overview'

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

type BrandDraft = {
  brandingMode: CampaignBrandingMode
  brandingSourceOrganisationId: string
  brandingLogoUrl: string
  brandingCompanyName: string
  brandingShowAttribution: boolean
  brandingPrimaryColor: string
  brandingSecondaryColor: string
  brandingSurfaceTintColor: string
  brandingHeroSurfaceColor: string
  brandingHeroGradientEndColor: string
  brandingHeroTextColorOverride: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function buildPatch(draft: BrandDraft) {
  return {
    branding_mode: draft.brandingMode,
    branding_source_organisation_id: draft.brandingSourceOrganisationId || null,
    branding_logo_url: draft.brandingLogoUrl.trim() || null,
    branding_company_name: draft.brandingCompanyName.trim() || null,
    branding_show_lq_attribution: draft.brandingShowAttribution,
    branding_primary_color: draft.brandingPrimaryColor.trim() || null,
    branding_secondary_color: draft.brandingSecondaryColor.trim() || null,
    branding_surface_tint_color: draft.brandingSurfaceTintColor.trim() || null,
    branding_hero_surface_color: draft.brandingHeroSurfaceColor.trim() || null,
    branding_hero_gradient_end_color: draft.brandingHeroGradientEndColor.trim() || null,
    branding_hero_text_color_override: draft.brandingHeroTextColorOverride.trim() || null,
  }
}

export default function CampaignBrandPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [platformBrand, setPlatformBrand] = useState<OrgBrandingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [uiMode, setUiMode] = useState<'lq' | 'client' | 'campaign_custom'>('lq')

  const [draft, setDraft] = useState<BrandDraft>({
    brandingMode: 'lq',
    brandingSourceOrganisationId: '',
    brandingLogoUrl: '',
    brandingCompanyName: '',
    brandingShowAttribution: true,
    brandingPrimaryColor: '',
    brandingSecondaryColor: '',
    brandingSurfaceTintColor: '',
    brandingHeroSurfaceColor: '',
    brandingHeroGradientEndColor: '',
    brandingHeroTextColorOverride: '',
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewObjectUrlRef = useRef<string | null>(null)
  const draftRef = useRef(draft)
  const lastSavedKeyRef = useRef('')
  const immediateSaveKeyRef = useRef<string | null>(null)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
      }
    }
  }, [])

  const draftPatch = useMemo(() => buildPatch(draft), [draft])
  const saveKey = useMemo(() => JSON.stringify(draftPatch), [draftPatch])
  const isDirty = saveKey !== lastSavedKeyRef.current

  const persistBrand = useCallback(async (patch: ReturnType<typeof buildPatch>, nextSaveKey: string) => {
    setSaveState('saving')
    setSaveError(null)

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: patch }),
      })
      const body = (await response.json().catch(() => null)) as MutationResponse | null
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? 'Failed to save brand configuration.')
      }

      lastSavedKeyRef.current = nextSaveKey
      setSaveState('saved')
      setSaveError(null)
    } catch (error) {
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : 'Failed to save brand configuration.')
    }
  }, [campaignId])

  // Debounce auto-save (600ms)
  useEffect(() => {
    if (saveKey === lastSavedKeyRef.current) return
    if (saveKey === immediateSaveKeyRef.current) return

    const timeoutId = window.setTimeout(() => {
      void persistBrand(draftPatch, saveKey)
    }, 600)

    return () => { window.clearTimeout(timeoutId) }
  }, [draftPatch, persistBrand, saveKey])

  function hydrateDraft(c: Campaign) {
    const next: BrandDraft = {
      brandingMode: c.config.branding_mode,
      brandingSourceOrganisationId: c.config.branding_source_organisation_id ?? c.organisation_id ?? '',
      brandingLogoUrl: c.config.branding_logo_url ?? '',
      brandingCompanyName: c.config.branding_company_name ?? '',
      brandingShowAttribution: c.config.branding_show_lq_attribution ?? true,
      brandingPrimaryColor: c.config.branding_primary_color ?? '',
      brandingSecondaryColor: c.config.branding_secondary_color ?? '',
      brandingSurfaceTintColor: c.config.branding_surface_tint_color ?? '',
      brandingHeroSurfaceColor: c.config.branding_hero_surface_color ?? '',
      brandingHeroGradientEndColor: c.config.branding_hero_gradient_end_color ?? '',
      brandingHeroTextColorOverride: c.config.branding_hero_text_color_override ?? '',
    }
    setDraft(next)
    setUiMode(deriveUiMode(next.brandingMode, next.brandingSourceOrganisationId))
    setLogoPreview(c.config.branding_logo_url ?? null)
    lastSavedKeyRef.current = JSON.stringify(buildPatch(next))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const [campaignRes, orgsRes, brandRes] = await Promise.all([
        fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
        fetch('/api/admin/organisations?pageSize=200', { cache: 'no-store' }),
        fetch('/api/admin/settings/brand', { cache: 'no-store' }),
      ])
      const campaignBody = (await campaignRes.json()) as CampaignResponse
      const orgsBody = (await orgsRes.json().catch(() => null)) as OrganisationsResponse | null
      const brandBody = (await brandRes.json().catch(() => null)) as { ok?: boolean; brand?: unknown } | null
      if (!active) return
      const c = campaignBody.campaign ?? null
      setCampaign(c)
      if (c) hydrateDraft(c)
      setOrganisations(orgsBody?.organisations ?? [])
      if (brandBody?.ok && brandBody.brand) {
        setPlatformBrand(normalizeOrgBrandingConfig(brandBody.brand))
      }
      setLoading(false)
    }
    void load()
    return () => { active = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId])

  function updateDraft<K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  async function handleFileChange(file: File | null) {
    if (!file) return

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
    }
    previewObjectUrlRef.current = URL.createObjectURL(file)
    setLogoPreview(previewObjectUrlRef.current)
    setUploadingLogo(true)
    setSaveError(null)
    setSaveState('saving')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch(`/api/admin/campaigns/${campaignId}/assets`, {
        method: 'POST',
        body: formData,
      })
      const uploadBody = (await uploadResponse.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null
      if (!uploadResponse.ok || !uploadBody?.ok || !uploadBody.url) {
        throw new Error(uploadBody?.error ?? 'Logo upload failed.')
      }

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
        previewObjectUrlRef.current = null
      }

      const nextDraft = { ...draftRef.current, brandingLogoUrl: uploadBody.url }
      const nextPatch = buildPatch(nextDraft)
      const nextSaveKey = JSON.stringify(nextPatch)
      immediateSaveKeyRef.current = nextSaveKey
      setDraft(nextDraft)
      setLogoPreview(uploadBody.url)
      await persistBrand(nextPatch, nextSaveKey)
    } catch (error) {
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : 'Logo upload failed.')
    } finally {
      setUploadingLogo(false)
      immediateSaveKeyRef.current = null
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleLogoUrlChange(value: string) {
    updateDraft('brandingLogoUrl', value)
    if (!previewObjectUrlRef.current) {
      setLogoPreview(value.trim() || null)
    }
  }

  function handleRemoveLogo() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
    setLogoPreview(null)
    updateDraft('brandingLogoUrl', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading...</p>
  }

  if (!campaign) {
    return <p className="text-sm text-red-500">Campaign not found.</p>
  }

  // Resolve the org branding config for the preview
  const selectedBrandSourceOrganisation =
    organisations.find((org) => org.id === draft.brandingSourceOrganisationId)
    ?? campaign.branding_source_organisation
    ?? (campaign.organisations?.id === draft.brandingSourceOrganisationId || !draft.brandingSourceOrganisationId
      ? campaign.organisations
      : null)

  const orgBrandingConfig = selectedBrandSourceOrganisation?.branding_config
    ? normalizeOrgBrandingConfig(selectedBrandSourceOrganisation.branding_config as Partial<OrgBrandingConfig>)
    : null

  const previewCampaignConfig = normalizeCampaignConfig({
    ...campaign.config,
    branding_mode: draft.brandingMode,
    branding_source_organisation_id: draft.brandingSourceOrganisationId || null,
    branding_logo_url: draft.brandingLogoUrl.trim() || null,
    branding_company_name: draft.brandingCompanyName.trim() || null,
    branding_show_lq_attribution: draft.brandingShowAttribution,
    branding_primary_color: draft.brandingPrimaryColor.trim() || null,
    branding_secondary_color: draft.brandingSecondaryColor.trim() || null,
    branding_surface_tint_color: draft.brandingSurfaceTintColor.trim() || null,
    branding_hero_surface_color: draft.brandingHeroSurfaceColor.trim() || null,
    branding_hero_gradient_end_color: draft.brandingHeroGradientEndColor.trim() || null,
    branding_hero_text_color_override: draft.brandingHeroTextColorOverride.trim() || null,
  })

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaign brand"
        title={campaign.name}
      />

      <CampaignBrandForm
        uiMode={uiMode}
        brandingMode={draft.brandingMode}
        brandingSourceOrganisationId={draft.brandingSourceOrganisationId}
        brandingLogoUrl={draft.brandingLogoUrl}
        brandingLogoPreview={logoPreview}
        brandingCompanyName={draft.brandingCompanyName}
        brandingShowAttribution={draft.brandingShowAttribution}
        brandingPrimaryColor={draft.brandingPrimaryColor}
        brandingSecondaryColor={draft.brandingSecondaryColor}
        brandingSurfaceTintColor={draft.brandingSurfaceTintColor}
        brandingHeroSurfaceColor={draft.brandingHeroSurfaceColor}
        brandingHeroGradientEndColor={draft.brandingHeroGradientEndColor}
        brandingHeroTextColorOverride={draft.brandingHeroTextColorOverride}
        organisations={organisations}
        platformBrand={platformBrand}
        previewCampaignConfig={previewCampaignConfig}
        previewOrganisationBrandingConfig={orgBrandingConfig}
        brandingFileInputRef={fileInputRef}
        saveStatus={saveState}
        saveError={saveError}
        uploadingLogo={uploadingLogo}
        isDirty={isDirty}
        onUiModeChange={setUiMode}
        onBrandingModeChange={(value) => updateDraft('brandingMode', value)}
        onBrandingSourceOrganisationIdChange={(value) => updateDraft('brandingSourceOrganisationId', value)}
        onBrandingLogoUrlChange={handleLogoUrlChange}
        onBrandingCompanyNameChange={(value) => updateDraft('brandingCompanyName', value)}
        onBrandingShowAttributionChange={(value) => updateDraft('brandingShowAttribution', value)}
        onBrandingPrimaryColorChange={(value) => updateDraft('brandingPrimaryColor', value)}
        onBrandingSecondaryColorChange={(value) => updateDraft('brandingSecondaryColor', value)}
        onBrandingSurfaceTintColorChange={(value) => updateDraft('brandingSurfaceTintColor', value)}
        onBrandingHeroSurfaceColorChange={(value) => updateDraft('brandingHeroSurfaceColor', value)}
        onBrandingHeroGradientEndColorChange={(value) => updateDraft('brandingHeroGradientEndColor', value)}
        onBrandingHeroTextColorOverrideChange={(value) => updateDraft('brandingHeroTextColorOverride', value)}
        onBrandingFileChange={handleFileChange}
        onBrandingRemoveLogo={handleRemoveLogo}
        onRetrySave={() => void persistBrand(draftPatch, saveKey)}
      />
    </DashboardPageShell>
  )
}
