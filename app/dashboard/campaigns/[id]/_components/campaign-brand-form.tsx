'use client'

import { useMemo, useState, type ReactNode, type RefObject } from 'react'
import { ColorField } from '@/components/dashboard/ui/color-field'
import { AssessmentExperiencePreview } from '@/components/dashboard/assessments/experience-preview-core'
import { BrandAwarePreviewShell } from '@/components/dashboard/assessments/brand-aware-preview-shell'
import {
  getEffectiveSeedColors,
  normalizeOrgBrandingConfig,
  validateHexColor,
  type OrgBrandingConfig,
} from '@/utils/brand/org-brand-utils'
import {
  normalizeRunnerConfig,
  normalizeReportConfig,
} from '@/utils/assessments/experience-config'
import {
  DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG,
} from '@/utils/assessments/assessment-experience-config'
import type {
  CampaignBrandingMode,
  CampaignConfig,
} from '@/utils/assessments/campaign-types'
import type { Organisation } from '../_lib/campaign-overview'

type UiMode = 'lq' | 'client' | 'campaign_custom'
type BrandTab = 'identity' | 'palette'
type PreviewTab = 'assessment' | 'registration' | 'report'

const MODE_OPTIONS: Array<{ key: UiMode; label: string }> = [
  { key: 'lq', label: 'Leadership Quarter' },
  { key: 'client', label: 'Client brand' },
  { key: 'campaign_custom', label: 'Campaign custom' },
]

const BRAND_TABS: Array<{ key: BrandTab; label: string }> = [
  { key: 'identity', label: 'Identity' },
  { key: 'palette', label: 'Palette' },
]

const PREVIEW_TABS: Array<{ key: PreviewTab; label: string }> = [
  { key: 'assessment', label: 'Assessment flow' },
  { key: 'registration', label: 'Registration' },
  { key: 'report', label: 'Report card' },
]

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
      {helper ? <p className="text-xs text-[var(--admin-text-muted)]">{helper}</p> : null}
    </label>
  )
}

export function deriveUiMode(brandingMode: CampaignBrandingMode, brandingSourceOrganisationId: string): UiMode {
  if (brandingMode === 'lq') return 'lq'
  if (brandingMode === 'none') return 'lq' // treat legacy 'none' as LQ
  return brandingSourceOrganisationId ? 'client' : 'campaign_custom'
}

export function CampaignBrandForm({
  uiMode,
  brandingMode,
  brandingSourceOrganisationId,
  brandingLogoUrl,
  brandingLogoPreview,
  brandingCompanyName,
  brandingShowAttribution,
  brandingPrimaryColor,
  brandingSecondaryColor,
  brandingSurfaceTintColor,
  brandingHeroSurfaceColor,
  brandingHeroGradientEndColor,
  brandingHeroTextColorOverride,
  organisations,
  platformBrand,
  previewCampaignConfig,
  previewOrganisationBrandingConfig,
  brandingFileInputRef,
  saveStatus,
  saveError,
  uploadingLogo,
  isDirty,
  onUiModeChange,
  onBrandingModeChange,
  onBrandingSourceOrganisationIdChange,
  onBrandingLogoUrlChange,
  onBrandingCompanyNameChange,
  onBrandingShowAttributionChange,
  onBrandingPrimaryColorChange,
  onBrandingSecondaryColorChange,
  onBrandingSurfaceTintColorChange,
  onBrandingHeroSurfaceColorChange,
  onBrandingHeroGradientEndColorChange,
  onBrandingHeroTextColorOverrideChange,
  onBrandingFileChange,
  onBrandingRemoveLogo,
  onRetrySave,
}: {
  uiMode: UiMode
  brandingMode: CampaignBrandingMode
  brandingSourceOrganisationId: string
  brandingLogoUrl: string
  brandingLogoPreview: string | null
  brandingCompanyName: string
  brandingShowAttribution: boolean
  brandingPrimaryColor: string
  brandingSecondaryColor: string
  brandingSurfaceTintColor: string
  brandingHeroSurfaceColor: string
  brandingHeroGradientEndColor: string
  brandingHeroTextColorOverride: string
  organisations: Organisation[]
  platformBrand: OrgBrandingConfig | null
  previewCampaignConfig: CampaignConfig
  previewOrganisationBrandingConfig: OrgBrandingConfig | null
  brandingFileInputRef: RefObject<HTMLInputElement | null>
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  saveError: string | null
  uploadingLogo: boolean
  isDirty: boolean
  onUiModeChange: (value: UiMode) => void
  onBrandingModeChange: (value: CampaignBrandingMode) => void
  onBrandingSourceOrganisationIdChange: (value: string) => void
  onBrandingLogoUrlChange: (value: string) => void
  onBrandingCompanyNameChange: (value: string) => void
  onBrandingShowAttributionChange: (value: boolean) => void
  onBrandingPrimaryColorChange: (value: string) => void
  onBrandingSecondaryColorChange: (value: string) => void
  onBrandingSurfaceTintColorChange: (value: string) => void
  onBrandingHeroSurfaceColorChange: (value: string) => void
  onBrandingHeroGradientEndColorChange: (value: string) => void
  onBrandingHeroTextColorOverrideChange: (value: string) => void
  onBrandingFileChange: (file: File | null) => void
  onBrandingRemoveLogo: () => void
  onRetrySave: () => void
}) {
  const [activeTab, setActiveTab] = useState<BrandTab>('identity')
  const [previewTab, setPreviewTab] = useState<PreviewTab>('assessment')
  const [brandSearch, setBrandSearch] = useState('')

  const showTabs = uiMode === 'client' || uiMode === 'campaign_custom'

  const filteredOrganisations = useMemo(() => {
    const query = brandSearch.trim().toLowerCase()
    if (!query) return organisations
    return organisations.filter((org) => {
      const haystack = [org.name, org.slug].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [brandSearch, organisations])

  // Build a preview branding config for the live preview panels
  const previewBranding = useMemo<OrgBrandingConfig>(() => {
    if (uiMode === 'lq') {
      if (platformBrand) {
        return { ...platformBrand, branding_enabled: true }
      }
      return normalizeOrgBrandingConfig({
        theme_version: 1,
        branding_enabled: true,
      })
    }

    if (uiMode === 'client') {
      // Client brand: merge campaign colour overrides on top of org branding
      const base = previewOrganisationBrandingConfig ?? normalizeOrgBrandingConfig({ theme_version: 1, branding_enabled: true })
      return normalizeOrgBrandingConfig({
        ...base,
        branding_enabled: true,
        logo_url: brandingLogoUrl.trim() || base.logo_url,
        company_name: brandingCompanyName.trim() || base.company_name,
        show_lq_attribution: brandingShowAttribution,
        hero_gradient_start_color: (brandingHeroSurfaceColor.trim() && validateHexColor(brandingHeroSurfaceColor.trim()) ? brandingHeroSurfaceColor.trim() : null) ?? base.hero_gradient_start_color,
        hero_gradient_end_color: (brandingHeroGradientEndColor.trim() && validateHexColor(brandingHeroGradientEndColor.trim()) ? brandingHeroGradientEndColor.trim() : null) ?? base.hero_gradient_end_color,
        canvas_tint_color: (brandingSurfaceTintColor.trim() && validateHexColor(brandingSurfaceTintColor.trim()) ? brandingSurfaceTintColor.trim() : null) ?? base.canvas_tint_color,
        primary_cta_color: (brandingPrimaryColor.trim() && validateHexColor(brandingPrimaryColor.trim()) ? brandingPrimaryColor.trim() : null) ?? base.primary_cta_color,
        secondary_cta_accent_color: (brandingSecondaryColor.trim() && validateHexColor(brandingSecondaryColor.trim()) ? brandingSecondaryColor.trim() : null) ?? base.secondary_cta_accent_color,
        hero_text_color_override: (brandingHeroTextColorOverride.trim() && validateHexColor(brandingHeroTextColorOverride.trim()) ? brandingHeroTextColorOverride.trim() : null) ?? base.hero_text_color_override,
        primary_color: (brandingPrimaryColor.trim() && validateHexColor(brandingPrimaryColor.trim()) ? brandingPrimaryColor.trim() : null) ?? base.primary_color,
        secondary_color: (brandingSecondaryColor.trim() && validateHexColor(brandingSecondaryColor.trim()) ? brandingSecondaryColor.trim() : null) ?? base.secondary_color,
        surface_tint_color: (brandingSurfaceTintColor.trim() && validateHexColor(brandingSurfaceTintColor.trim()) ? brandingSurfaceTintColor.trim() : null) ?? base.surface_tint_color,
        hero_surface_color: (brandingHeroSurfaceColor.trim() && validateHexColor(brandingHeroSurfaceColor.trim()) ? brandingHeroSurfaceColor.trim() : null) ?? base.hero_surface_color,
      })
    }

    // campaign_custom: campaign's own colour fields form the full palette
    return normalizeOrgBrandingConfig({
      theme_version: 1,
      branding_enabled: true,
      logo_url: brandingLogoUrl.trim() || null,
      company_name: brandingCompanyName.trim() || null,
      show_lq_attribution: brandingShowAttribution,
      hero_gradient_start_color: brandingHeroSurfaceColor.trim() && validateHexColor(brandingHeroSurfaceColor.trim()) ? brandingHeroSurfaceColor.trim() : null,
      hero_gradient_end_color: brandingHeroGradientEndColor.trim() && validateHexColor(brandingHeroGradientEndColor.trim()) ? brandingHeroGradientEndColor.trim() : null,
      canvas_tint_color: brandingSurfaceTintColor.trim() && validateHexColor(brandingSurfaceTintColor.trim()) ? brandingSurfaceTintColor.trim() : null,
      primary_cta_color: brandingPrimaryColor.trim() && validateHexColor(brandingPrimaryColor.trim()) ? brandingPrimaryColor.trim() : null,
      secondary_cta_accent_color: brandingSecondaryColor.trim() && validateHexColor(brandingSecondaryColor.trim()) ? brandingSecondaryColor.trim() : null,
      hero_text_color_override: brandingHeroTextColorOverride.trim() && validateHexColor(brandingHeroTextColorOverride.trim()) ? brandingHeroTextColorOverride.trim() : null,
      primary_color: brandingPrimaryColor.trim() && validateHexColor(brandingPrimaryColor.trim()) ? brandingPrimaryColor.trim() : null,
      secondary_color: brandingSecondaryColor.trim() && validateHexColor(brandingSecondaryColor.trim()) ? brandingSecondaryColor.trim() : null,
      surface_tint_color: brandingSurfaceTintColor.trim() && validateHexColor(brandingSurfaceTintColor.trim()) ? brandingSurfaceTintColor.trim() : null,
      hero_surface_color: brandingHeroSurfaceColor.trim() && validateHexColor(brandingHeroSurfaceColor.trim()) ? brandingHeroSurfaceColor.trim() : null,
    })
  }, [
    uiMode, platformBrand, previewOrganisationBrandingConfig,
    brandingLogoUrl, brandingCompanyName, brandingShowAttribution,
    brandingPrimaryColor, brandingSecondaryColor, brandingSurfaceTintColor,
    brandingHeroSurfaceColor, brandingHeroGradientEndColor, brandingHeroTextColorOverride,
  ])

  const effectiveColors = useMemo(
    () => getEffectiveSeedColors(previewBranding),
    [previewBranding]
  )

  function handleUiModeChange(nextUiMode: UiMode) {
    onUiModeChange(nextUiMode)
    if (nextUiMode === 'lq') {
      onBrandingModeChange('lq')
      onBrandingSourceOrganisationIdChange('')
    } else if (nextUiMode === 'client') {
      onBrandingModeChange('custom')
      // Keep current org if one is set, otherwise leave empty for selection
    } else {
      // campaign_custom
      onBrandingModeChange('custom')
      onBrandingSourceOrganisationIdChange('')
    }
  }

  const statusMessage = saveError
    ? saveError
    : uploadingLogo
      ? 'Uploading logo...'
      : saveStatus === 'saving'
        ? 'Saving brand...'
        : !isDirty
          ? 'All changes saved.'
          : 'Changes will save automatically.'

  const statusTone = saveError
    ? 'text-red-600'
    : 'text-[var(--admin-text-muted)]'

  const isClientPaletteReadOnly = uiMode === 'client'
  const paletteHelper = isClientPaletteReadOnly
    ? 'Inherited from client brand.'
    : 'Set for this campaign.'

  return (
    <section className="space-y-6">
      {/* Header card with mode selector */}
      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.06)] md:px-7 md:py-7">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">
              Campaign brand
            </p>
            <h2 className="mt-2 font-serif text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.02] text-[var(--admin-text-primary)]">
              Select a brand source and preview the participant experience.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
              Choose a brand mode. Client brand inherits from the client record. Campaign custom lets you author a full palette directly on this campaign.
            </p>
          </div>

          {/* 4-option mode selector */}
          <div className="admin-toggle-group overflow-x-auto" role="radiogroup" aria-label="Brand mode">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={uiMode === opt.key}
                onClick={() => handleUiModeChange(opt.key)}
                className={uiMode === opt.key ? 'admin-toggle-chip admin-toggle-chip-active' : 'admin-toggle-chip'}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Client brand: org selector */}
          {uiMode === 'client' ? (
            <div className="mt-2 space-y-2">
              <Field label="Client brand" helper="Select a client to inherit their brand palette.">
                <div className="flex-1">
                  <input
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    className="foundation-field mb-2 w-full"
                    placeholder="Filter clients..."
                  />
                  <select
                    value={brandingSourceOrganisationId}
                    onChange={(e) => onBrandingSourceOrganisationIdChange(e.target.value)}
                    className="foundation-field w-full"
                  >
                    <option value="">Select a client...</option>
                    {filteredOrganisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          ) : null}

          {/* Identity/Palette tabs for custom modes */}
          {showTabs ? (
            <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Campaign brand sections">
              {BRAND_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={activeTab === tab.key ? 'admin-toggle-chip admin-toggle-chip-active' : 'admin-toggle-chip'}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Identity tab -- shown for client and campaign_custom modes */}
      {showTabs && activeTab === 'identity' ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Identity</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">Logo, display name, and attribution overrides</h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
                  {uiMode === 'client'
                    ? 'These override the selected client brand for this campaign only. Leave blank to inherit from the client record.'
                    : 'Set the identity for this campaign. These values define the brand shown to participants.'}
                </p>
              </div>

              <Field
                label="Display name override"
                helper={uiMode === 'client' ? 'Optional. Leave blank to use the selected client brand name.' : 'The company or campaign name shown to participants.'}
              >
                <input
                  type="text"
                  value={brandingCompanyName}
                  onChange={(e) => onBrandingCompanyNameChange(e.target.value)}
                  className="foundation-field w-full"
                  placeholder={uiMode === 'client' ? 'Defaults to selected client brand' : 'e.g. Acme Corp'}
                />
              </Field>

              <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.16)] bg-[rgba(247,249,252,0.82)] p-5">
                <div className="flex flex-wrap items-center gap-4">
                  {brandingLogoPreview ? (
                    <div className="flex h-20 w-48 items-center justify-center rounded-[1.1rem] border border-[rgba(103,127,159,0.14)] bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={brandingLogoPreview} alt="Campaign logo preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-48 items-center justify-center rounded-[1.1rem] border border-dashed border-[rgba(103,127,159,0.16)] bg-white text-xs text-[var(--admin-text-muted)]">
                      {uiMode === 'client' ? 'Inherit logo from selected brand' : 'No logo uploaded'}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => brandingFileInputRef.current?.click()}
                      className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm"
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? 'Uploading...' : brandingLogoPreview ? 'Replace logo' : 'Upload logo'}
                    </button>
                    {brandingLogoPreview ? (
                      <button
                        type="button"
                        onClick={onBrandingRemoveLogo}
                        className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={brandingFileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  className="hidden"
                  onChange={(e) => onBrandingFileChange(e.target.files?.[0] ?? null)}
                />
                <Field label="Logo URL" helper={uiMode === 'client' ? 'Optional. Leave blank to inherit the selected client brand logo.' : 'Direct URL to your logo image.'}>
                  <input
                    type="url"
                    value={brandingLogoUrl}
                    onChange={(e) => onBrandingLogoUrlChange(e.target.value)}
                    className="foundation-field mt-4 w-full"
                    placeholder="https://..."
                  />
                </Field>
              </div>

              <label className="flex items-start gap-3 rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-5 text-sm text-[var(--admin-text-primary)]">
                <input
                  type="checkbox"
                  checked={brandingShowAttribution}
                  onChange={(e) => onBrandingShowAttributionChange(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[rgba(103,127,159,0.24)]"
                />
                <span>
                  Show Leadership Quarter attribution for this campaign
                  <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                    This is the default attribution setting that campaigns and reports can inherit or override.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {/* Palette tab -- shown for client (read-only) and campaign_custom (editable) */}
      {showTabs && activeTab === 'palette' ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Palette</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">
                {isClientPaletteReadOnly
                  ? 'Inherited from the selected client brand'
                  : 'Campaign colour palette'}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
                {isClientPaletteReadOnly
                  ? 'These colours are defined on the client record. Edit them from the client\u2019s Branding tab. The campaign inherits these values and does not override them.'
                  : 'Define the colours used across the participant experience for this campaign.'}
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Hero and stage</p>
                  <h4 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">The two colours used for stronger gradient surfaces</h4>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <ColorField
                    label="Hero gradient start"
                    value={isClientPaletteReadOnly ? (previewBranding.hero_gradient_start_color ?? '') : brandingHeroSurfaceColor}
                    onChange={isClientPaletteReadOnly ? () => {} : onBrandingHeroSurfaceColorChange}
                    placeholder="#254d7e"
                    helper={paletteHelper}
                    fallback="#254d7e"
                    invalid={!isClientPaletteReadOnly && brandingHeroSurfaceColor.trim() !== '' && !validateHexColor(brandingHeroSurfaceColor.trim())}
                    adjustedTo={effectiveColors.heroStart.adjusted ? effectiveColors.heroStart.effective : null}
                    disabled={isClientPaletteReadOnly}
                  />
                  <ColorField
                    label="Hero gradient end"
                    value={isClientPaletteReadOnly ? (previewBranding.hero_gradient_end_color ?? '') : brandingHeroGradientEndColor}
                    onChange={isClientPaletteReadOnly ? () => {} : onBrandingHeroGradientEndColorChange}
                    placeholder="#5f87b8"
                    helper={paletteHelper}
                    fallback="#5f87b8"
                    invalid={!isClientPaletteReadOnly && brandingHeroGradientEndColor.trim() !== '' && !validateHexColor(brandingHeroGradientEndColor.trim())}
                    adjustedTo={effectiveColors.heroEnd.adjusted ? effectiveColors.heroEnd.effective : null}
                    disabled={isClientPaletteReadOnly}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Actions and surfaces</p>
                  <h4 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">Canvas and action colours</h4>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                  <ColorField
                    label="Canvas tint"
                    value={isClientPaletteReadOnly ? (previewBranding.canvas_tint_color ?? '') : brandingSurfaceTintColor}
                    onChange={isClientPaletteReadOnly ? () => {} : onBrandingSurfaceTintColorChange}
                    placeholder="#f7f4ee"
                    helper={paletteHelper}
                    fallback="#f7f4ee"
                    invalid={!isClientPaletteReadOnly && brandingSurfaceTintColor.trim() !== '' && !validateHexColor(brandingSurfaceTintColor.trim())}
                    adjustedTo={effectiveColors.canvas.adjusted ? effectiveColors.canvas.effective : null}
                    disabled={isClientPaletteReadOnly}
                  />
                  <ColorField
                    label="Primary CTA"
                    value={isClientPaletteReadOnly ? (previewBranding.primary_cta_color ?? '') : brandingPrimaryColor}
                    onChange={isClientPaletteReadOnly ? () => {} : onBrandingPrimaryColorChange}
                    placeholder="#2f5f99"
                    helper={paletteHelper}
                    fallback="#2f5f99"
                    invalid={!isClientPaletteReadOnly && brandingPrimaryColor.trim() !== '' && !validateHexColor(brandingPrimaryColor.trim())}
                    adjustedTo={effectiveColors.primary.adjusted ? effectiveColors.primary.effective : null}
                    disabled={isClientPaletteReadOnly}
                  />
                  <ColorField
                    label="Secondary CTA and accent"
                    value={isClientPaletteReadOnly ? (previewBranding.secondary_cta_accent_color ?? '') : brandingSecondaryColor}
                    onChange={isClientPaletteReadOnly ? () => {} : onBrandingSecondaryColorChange}
                    placeholder="#d9b46d"
                    helper={paletteHelper}
                    fallback="#d9b46d"
                    invalid={!isClientPaletteReadOnly && brandingSecondaryColor.trim() !== '' && !validateHexColor(brandingSecondaryColor.trim())}
                    adjustedTo={effectiveColors.secondary.adjusted ? effectiveColors.secondary.effective : null}
                    disabled={isClientPaletteReadOnly}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Advanced</p>
                  <h4 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">Hero text colour</h4>
                </div>
                <div className="mt-5 max-w-xl">
                  <ColorField
                    label="Hero text override"
                    value={isClientPaletteReadOnly ? (previewBranding.hero_text_color_override ?? '') : brandingHeroTextColorOverride}
                    onChange={isClientPaletteReadOnly ? () => {} : onBrandingHeroTextColorOverrideChange}
                    placeholder="#f9f5ee"
                    helper={paletteHelper}
                    fallback="#f9f5ee"
                    invalid={!isClientPaletteReadOnly && brandingHeroTextColorOverride.trim() !== '' && !validateHexColor(brandingHeroTextColorOverride.trim())}
                    disabled={isClientPaletteReadOnly}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Live preview -- shown for all modes */}
      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Live preview</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">
            See how the brand renders across participant-facing surfaces
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
            Every preview uses the same theme engine and CSS variable injection as the production participant experience.
          </p>
        </div>

        <div className="mt-5 admin-toggle-group overflow-x-auto" role="tablist" aria-label="Brand preview surfaces">
          {PREVIEW_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={previewTab === tab.key}
              onClick={() => setPreviewTab(tab.key)}
              className={previewTab === tab.key ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {previewTab === 'assessment' ? (
            <AssessmentExperiencePreview
              runnerConfig={normalizeRunnerConfig({
                title: 'AI Readiness Orientation',
                subtitle: 'Understand how you currently approach AI-supported leadership.',
                intro: 'Leadership assessment',
                estimated_minutes: 8,
                start_cta_label: 'Begin assessment',
                completion_screen_title: 'Assessment complete',
                completion_screen_body: 'Your report is ready to view.',
                completion_screen_cta_label: 'View your report',
              })}
              reportConfig={normalizeReportConfig({})}
              experienceConfig={DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG}
              brandingConfig={previewBranding}
              fullWidth
            />
          ) : null}

          {previewTab === 'registration' ? (
            <BrandAwarePreviewShell brandingConfig={previewBranding}>
              <div className="rounded-[1.5rem] p-6 md:p-8">
                <div className="site-card-strong overflow-hidden p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--site-text-muted)]">
                    Registration
                  </p>
                  <h2 className="mt-3 font-serif text-[clamp(1.8rem,4vw,3rem)] leading-[1.06] text-[var(--site-text-primary)]">
                    Tell us about yourself
                  </h2>
                  <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
                    Complete the fields below so we can personalise your experience and share your results.
                  </p>

                  <div className="mt-8 space-y-5 border-t border-[var(--site-border-soft)] pt-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                          First name <span className="text-[var(--site-required)]">*</span>
                        </label>
                        <input
                          readOnly
                          placeholder="Jane"
                          className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                          Last name <span className="text-[var(--site-required)]">*</span>
                        </label>
                        <input
                          readOnly
                          placeholder="Smith"
                          className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                        Work email <span className="text-[var(--site-required)]">*</span>
                      </label>
                      <input
                        readOnly
                        placeholder="jane@example.com"
                        className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                          Organisation
                        </label>
                        <input
                          readOnly
                          placeholder="Acme Corp"
                          className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[var(--site-text-primary)]">
                          Role / Job title
                        </label>
                        <input
                          readOnly
                          placeholder="Head of People"
                          className="w-full rounded-2xl border border-[var(--site-field-border)] bg-[var(--site-field-bg)] px-4 py-3 text-sm text-[var(--site-text-primary)] placeholder:text-[var(--site-text-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                        />
                      </div>
                    </div>

                    <p className="text-sm text-[var(--site-error)]">This is how error messages appear.</p>

                    <div className="pt-2">
                      <button
                        type="button"
                        className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-cta-bg)] px-10 py-4 text-base font-semibold tracking-[0.02em] text-[var(--site-cta-text)] shadow-[0_16px_40px_var(--site-cta-soft)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </BrandAwarePreviewShell>
          ) : null}

          {previewTab === 'report' ? (
            <BrandAwarePreviewShell brandingConfig={previewBranding}>
              <div className="rounded-[1.5rem] p-6 md:p-8">
                <div className="space-y-5">
                  <div className="assessment-web-report-hero site-card-strong rounded-[28px] bg-[var(--site-panel-hero-bg)] px-6 py-8 text-[var(--site-panel-hero-text)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-80">Assessment report</p>
                    <h2 className="mt-3 font-serif text-[clamp(1.8rem,4vw,3rem)] leading-[1.06]">
                      AI Readiness Orientation
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--site-panel-hero-muted)]">
                      Your current profile and the key areas to focus on next.
                    </p>
                    <div className="assessment-web-report-meta mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--site-panel-hero-muted)]">
                      <span>Jane Smith</span>
                      <span>Completed 23 Mar 2026</span>
                    </div>
                  </div>

                  <div className="assessment-report-section-card assessment-report-section-card-hero rounded-[28px] border border-[var(--site-report-section-border)] [background:var(--site-report-hero-section-bg)] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--site-text-secondary)]">Your profile</p>
                    <h3 className="mt-2.5 font-serif text-[clamp(1.6rem,3.5vw,2.4rem)] leading-[1.05] text-[var(--site-text-primary)]">
                      Strategic Integrator
                    </h3>
                    <p className="mt-3 max-w-2xl text-base text-[var(--site-text-body)]">
                      You approach AI adoption with a strategic mindset, balancing opportunity with practical constraints.
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { label: 'Strategic Vision', value: 78, band: 'High' },
                      { label: 'Practical Integration', value: 54, band: 'Mid' },
                      { label: 'Team Enablement', value: 41, band: 'Mid' },
                    ].map((dim) => (
                      <div key={dim.label} className="assessment-report-score-card rounded-[22px] border border-[var(--site-report-section-border)] [background:var(--site-panel-card-bg)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--site-text-primary)]">{dim.label}</p>
                          <div className="text-right">
                            <p className="text-xl font-semibold tabular-nums text-[var(--site-text-primary)]">{dim.value}</p>
                            <p className="text-[11px] uppercase tracking-wide text-[var(--site-text-secondary)]">{dim.band}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="assessment-report-section-card rounded-[26px] border border-[var(--site-report-section-border)] [background:var(--site-report-section-bg)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--site-text-secondary)]">Trait scores</p>
                    <h3 className="mt-2.5 font-serif text-[clamp(1.55rem,2.3vw,2.05rem)] leading-[1.08] text-[var(--site-text-primary)]">
                      How you scored across key traits
                    </h3>
                    <div className="mt-5 space-y-4">
                      {[
                        { label: 'AI Strategy', value: 78 },
                        { label: 'Tool Fluency', value: 54 },
                        { label: 'Team Coaching', value: 41 },
                      ].map((trait) => (
                        <div key={trait.label} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-[var(--site-text-primary)]">{trait.label}</p>
                            <span className="text-sm font-semibold tabular-nums text-[var(--site-text-primary)]">{trait.value}</span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--site-progress-track)]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${trait.value}%`, background: 'var(--site-progress-fill)' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="assessment-report-section-card assessment-report-cta-card rounded-[26px] border border-[var(--site-report-section-border)] [background:var(--site-report-section-bg)] p-8 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--site-text-secondary)]">Next steps</p>
                    <h2 className="mt-2.5 font-serif text-[clamp(1.7rem,2.5vw,2.3rem)] leading-[1.08] text-[var(--site-text-primary)]">Continue your development</h2>
                    <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--site-text-muted)]">
                      Discuss your results with a Leadership Quarter consultant.
                    </p>
                    <div className="mt-6">
                      <span className="font-cta inline-flex items-center justify-center rounded-[999px] bg-[var(--site-cta-bg)] px-6 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)]">
                        Explore Leadership Quarter
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </BrandAwarePreviewShell>
          ) : null}
        </div>
      </div>

      {/* Status bar */}
      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-5 shadow-[0_22px_60px_rgba(15,23,42,0.05)] md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm ${statusTone}`}>{statusMessage}</p>
          {saveError ? (
            <button
              type="button"
              onClick={onRetrySave}
              className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm"
            >
              Retry save
            </button>
          ) : (
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--admin-text-soft)]">
              Autosave enabled
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
