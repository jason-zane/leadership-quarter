'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { CampaignBrandingSpecimen } from '@/components/site/campaign-branding-specimen'
import { ColorField } from '@/components/dashboard/ui/color-field'
import {
  getEffectiveSeedColors,
  normalizeOrgBrandingConfig,
  validateHexColor,
  type OrgBrandingConfig,
} from '@/utils/brand/org-brand-utils'

type Props = {
  organisationId: string
  initialBranding: OrgBrandingConfig
}

type BrandTab = 'identity' | 'palette'

type BrandSaveState = 'idle' | 'saving' | 'saved' | 'error'

type BrandingDraft = {
  brandingEnabled: boolean
  logoUrl: string
  companyName: string
  showAttribution: boolean
  heroGradientStartColor: string
  heroGradientEndColor: string
  canvasTintColor: string
  primaryCtaColor: string
  secondaryCtaAccentColor: string
  heroTextColorOverride: string
}

const BRAND_TABS: Array<{ key: BrandTab; label: string }> = [
  { key: 'identity', label: 'Identity' },
  { key: 'palette', label: 'Palette' },
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

function createDraft(initialBranding: OrgBrandingConfig): BrandingDraft {
  return {
    brandingEnabled: initialBranding.branding_enabled,
    logoUrl: initialBranding.logo_url ?? '',
    companyName: initialBranding.company_name ?? '',
    showAttribution: initialBranding.show_lq_attribution,
    heroGradientStartColor:
      initialBranding.hero_gradient_start_color
      ?? initialBranding.hero_surface_color
      ?? '',
    heroGradientEndColor:
      initialBranding.hero_gradient_end_color
      ?? initialBranding.secondary_cta_accent_color
      ?? initialBranding.secondary_color
      ?? '',
    canvasTintColor:
      initialBranding.canvas_tint_color
      ?? initialBranding.surface_tint_color
      ?? '',
    primaryCtaColor:
      initialBranding.primary_cta_color
      ?? initialBranding.primary_color
      ?? '',
    secondaryCtaAccentColor:
      initialBranding.secondary_cta_accent_color
      ?? initialBranding.secondary_color
      ?? '',
    heroTextColorOverride: initialBranding.hero_text_color_override ?? '',
  }
}

function buildBrandingPatch(draft: BrandingDraft): Partial<OrgBrandingConfig> {
  return {
    theme_version: 1,
    branding_enabled: draft.brandingEnabled,
    logo_url: draft.logoUrl.trim() || null,
    company_name: draft.companyName.trim() || null,
    show_lq_attribution: draft.showAttribution,
    hero_gradient_start_color: draft.heroGradientStartColor.trim() || null,
    hero_gradient_end_color: draft.heroGradientEndColor.trim() || null,
    canvas_tint_color: draft.canvasTintColor.trim() || null,
    primary_cta_color: draft.primaryCtaColor.trim() || null,
    secondary_cta_accent_color: draft.secondaryCtaAccentColor.trim() || null,
    hero_text_color_override: draft.heroTextColorOverride.trim() || null,
    primary_color: null,
    secondary_color: null,
    surface_tint_color: null,
    hero_surface_color: null,
  }
}

function buildPreviewBrandingConfig(initialBranding: OrgBrandingConfig, draft: BrandingDraft): OrgBrandingConfig {
  return normalizeOrgBrandingConfig({
    ...initialBranding,
    ...buildBrandingPatch(draft),
  })
}

function isOptionalHexValid(value: string) {
  return !value.trim() || validateHexColor(value.trim())
}

export function OrgBrandingCard({ organisationId, initialBranding }: Props) {
  const [activeTab, setActiveTab] = useState<BrandTab>('identity')
  const [draft, setDraft] = useState<BrandingDraft>(() => createDraft(initialBranding))
  const [logoPreview, setLogoPreview] = useState<string | null>(initialBranding.logo_url)
  const [saveState, setSaveState] = useState<BrandSaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewObjectUrlRef = useRef<string | null>(null)
  const draftRef = useRef(draft)
  const initialSaveKeyRef = useRef(JSON.stringify(buildBrandingPatch(createDraft(initialBranding))))
  const lastSavedKeyRef = useRef(initialSaveKeyRef.current)
  const immediateSaveKeyRef = useRef<string | null>(null)

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    const nextDraft = createDraft(initialBranding)
    setDraft(nextDraft)
    setLogoPreview(initialBranding.logo_url)
    setSaveState('idle')
    setSaveError(null)
    lastSavedKeyRef.current = JSON.stringify(buildBrandingPatch(nextDraft))
  }, [initialBranding])

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
      }
    }
  }, [])

  const previewBranding = useMemo(
    () => buildPreviewBrandingConfig(initialBranding, draft),
    [draft, initialBranding]
  )

  const draftPatch = useMemo(() => buildBrandingPatch(draft), [draft])
  const saveKey = useMemo(() => JSON.stringify(draftPatch), [draftPatch])

  const fieldValidity = useMemo(
    () => ({
      heroGradientStartColor: isOptionalHexValid(draft.heroGradientStartColor),
      heroGradientEndColor: isOptionalHexValid(draft.heroGradientEndColor),
      canvasTintColor: isOptionalHexValid(draft.canvasTintColor),
      primaryCtaColor: isOptionalHexValid(draft.primaryCtaColor),
      secondaryCtaAccentColor: isOptionalHexValid(draft.secondaryCtaAccentColor),
      heroTextColorOverride: isOptionalHexValid(draft.heroTextColorOverride),
    }),
    [draft.canvasTintColor, draft.heroGradientEndColor, draft.heroGradientStartColor, draft.heroTextColorOverride, draft.primaryCtaColor, draft.secondaryCtaAccentColor]
  )

  const effectiveColors = useMemo(
    () => getEffectiveSeedColors(previewBranding),
    [previewBranding]
  )

  const hasInvalidColors = Object.values(fieldValidity).some((value) => !value)
  const isDirty = saveKey !== lastSavedKeyRef.current

  const persistBranding = useCallback(async (patch: Partial<OrgBrandingConfig>, nextSaveKey: string) => {
    setSaveState('saving')
    setSaveError(null)

    try {
      const response = await fetch(`/api/admin/organisations/${organisationId}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding_config: patch }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        throw new Error(body?.error ?? 'Brand update failed.')
      }

      lastSavedKeyRef.current = nextSaveKey
      setSaveState('saved')
      setSaveError(null)
    } catch (error) {
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : 'Brand update failed.')
    }
  }, [organisationId])

  useEffect(() => {
    if (hasInvalidColors) {
      return
    }
    if (saveKey === lastSavedKeyRef.current) {
      return
    }
    if (saveKey === immediateSaveKeyRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void persistBranding(draftPatch, saveKey)
    }, 600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [draftPatch, hasInvalidColors, persistBranding, saveKey])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
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

      const uploadResponse = await fetch(`/api/admin/organisations/${organisationId}/assets`, {
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

      const nextDraft = {
        ...draftRef.current,
        logoUrl: uploadBody.url,
      }
      const nextPatch = buildBrandingPatch(nextDraft)
      const nextSaveKey = JSON.stringify(nextPatch)
      immediateSaveKeyRef.current = nextSaveKey
      setDraft(nextDraft)
      setLogoPreview(uploadBody.url)
      await persistBranding(nextPatch, nextSaveKey)
    } catch (error) {
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : 'Logo upload failed.')
    } finally {
      setUploadingLogo(false)
      immediateSaveKeyRef.current = null
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleRemoveLogo() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
    setLogoPreview(null)
    setDraft((current) => ({
      ...current,
      logoUrl: '',
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function updateDraft<K extends keyof BrandingDraft>(key: K, value: BrandingDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const statusMessage = saveError
    ? saveError
    : uploadingLogo
      ? 'Uploading logo...'
      : hasInvalidColors
        ? 'Fix the highlighted hex values to keep autosave running.'
        : saveState === 'saving'
          ? 'Saving brand...'
          : !isDirty
            ? 'All changes saved.'
            : 'Changes will save automatically.'

  const statusTone = saveError
    ? 'text-red-600'
    : hasInvalidColors
      ? 'text-amber-600'
      : 'text-[var(--admin-text-muted)]'

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.06)] md:px-7 md:py-7">
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">
              Participant brand
            </p>
            <h2 className="mt-2 font-serif text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.02] text-[var(--admin-text-primary)]">
              Define the participant brand once, then reuse it everywhere.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
              This client brand becomes the source for campaign experiences, report presentation, and any other participant-facing flow that selects this client. Keep the inputs semantic and let the theme system derive the rest.
            </p>
          </div>

          <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Client branding sections">
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
        </div>
      </div>

      {activeTab === 'identity' ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
            <label className="flex items-start gap-4 rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-5">
              <input
                type="checkbox"
                checked={draft.brandingEnabled}
                onChange={(event) => {
                  const next = event.target.checked
                  updateDraft('brandingEnabled', next)
                  if (next) {
                    setActiveTab('palette')
                  }
                }}
                className="mt-1 h-4 w-4 rounded border-[rgba(103,127,159,0.24)]"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Use a branded participant experience for this client</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--admin-text-muted)]">
                  When enabled, campaigns and reports can select this client brand instead of the default Leadership Quarter presentation.
                </p>
              </div>
            </label>
          </div>

          <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Identity</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">Logo, display name, and attribution</h3>
              </div>

              <Field label="Display name" helper="Used in participant headers when the logo is not shown or when text-led branding is preferable.">
                <input
                  type="text"
                  value={draft.companyName}
                  onChange={(event) => updateDraft('companyName', event.target.value)}
                  placeholder="Defaults to client name"
                  className="foundation-field w-full"
                />
              </Field>

              <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.16)] bg-[rgba(247,249,252,0.82)] p-5">
                <div className="flex flex-wrap items-center gap-4">
                  {logoPreview ? (
                    <div className="flex h-20 w-48 items-center justify-center rounded-[1.1rem] border border-[rgba(103,127,159,0.14)] bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-48 items-center justify-center rounded-[1.1rem] border border-dashed border-[rgba(103,127,159,0.16)] bg-white text-xs text-[var(--admin-text-muted)]">
                      No logo selected
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm"
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? 'Uploading...' : logoPreview ? 'Replace logo' : 'Upload logo'}
                    </button>
                    {logoPreview ? (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  className="hidden"
                  onChange={(event) => {
                    void handleFileChange(event)
                  }}
                />
                <Field label="Logo URL" helper="Optional. Uploaded files are usually the simplest option.">
                  <input
                    type="url"
                    value={draft.logoUrl}
                    onChange={(event) => {
                      const value = event.target.value
                      updateDraft('logoUrl', value)
                      setLogoPreview(value.trim() || null)
                    }}
                    placeholder="https://..."
                    className="foundation-field mt-4 w-full"
                  />
                </Field>
              </div>

              <label className="flex items-start gap-3 rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-5 text-sm text-[var(--admin-text-primary)]">
                <input
                  type="checkbox"
                  checked={draft.showAttribution}
                  onChange={(event) => updateDraft('showAttribution', event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[rgba(103,127,159,0.24)]"
                />
                <span>
                  Show “Powered by Leadership Quarter” on branded participant experiences
                  <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                    This is the default attribution setting that campaigns and reports can inherit or override.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'palette' ? (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Palette</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">Set the gradient, canvas, and action colours</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
                These are semantic inputs. The system derives the participant surfaces, highlights, and text treatment from them so the experience stays readable and consistent.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Hero and stage</p>
                  <h4 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">Choose the two colours used for stronger gradient surfaces</h4>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <ColorField
                    label="Hero gradient start"
                    value={draft.heroGradientStartColor}
                    onChange={(next) => updateDraft('heroGradientStartColor', next)}
                    placeholder="#254d7e"
                    helper="Used for the start of stronger participant panels and branded stage moments."
                    fallback="#254d7e"
                    invalid={!fieldValidity.heroGradientStartColor}
                    adjustedTo={effectiveColors.heroStart.adjusted ? effectiveColors.heroStart.effective : null}
                  />
                  <ColorField
                    label="Hero gradient end"
                    value={draft.heroGradientEndColor}
                    onChange={(next) => updateDraft('heroGradientEndColor', next)}
                    placeholder="#5f87b8"
                    helper="Used for the end of the stronger gradient so the hero has depth without becoming noisy."
                    fallback="#5f87b8"
                    invalid={!fieldValidity.heroGradientEndColor}
                    adjustedTo={effectiveColors.heroEnd.adjusted ? effectiveColors.heroEnd.effective : null}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Actions and surfaces</p>
                  <h4 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">Define the calmer canvas and the two action colours separately</h4>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                  <ColorField
                    label="Canvas tint"
                    value={draft.canvasTintColor}
                    onChange={(next) => updateDraft('canvasTintColor', next)}
                    placeholder="#f7f4ee"
                    helper="Used for page backgrounds, support panels, and form surfaces so the overall experience stays calm."
                    fallback="#f7f4ee"
                    invalid={!fieldValidity.canvasTintColor}
                    adjustedTo={effectiveColors.canvas.adjusted ? effectiveColors.canvas.effective : null}
                  />
                  <ColorField
                    label="Primary CTA"
                    value={draft.primaryCtaColor}
                    onChange={(next) => updateDraft('primaryCtaColor', next)}
                    placeholder="#2f5f99"
                    helper="Used for the main call to action, active states, and progress anchors."
                    fallback="#2f5f99"
                    invalid={!fieldValidity.primaryCtaColor}
                    adjustedTo={effectiveColors.primary.adjusted ? effectiveColors.primary.effective : null}
                  />
                  <ColorField
                    label="Secondary CTA and accent"
                    value={draft.secondaryCtaAccentColor}
                    onChange={(next) => updateDraft('secondaryCtaAccentColor', next)}
                    placeholder="#d9b46d"
                    helper="Used for softer buttons, highlights, and the finish of progress treatments."
                    fallback="#d9b46d"
                    invalid={!fieldValidity.secondaryCtaAccentColor}
                    adjustedTo={effectiveColors.secondary.adjusted ? effectiveColors.secondary.effective : null}
                  />
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Advanced</p>
                  <h4 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">Override the hero text colour only if auto contrast is not enough</h4>
                </div>
                <div className="mt-5 max-w-xl">
                  <ColorField
                    label="Hero text override"
                    value={draft.heroTextColorOverride}
                    onChange={(next) => updateDraft('heroTextColorOverride', next)}
                    placeholder="#f9f5ee"
                    helper="Optional. Leave blank to let the system choose the text colour automatically from the hero gradient."
                    fallback="#f9f5ee"
                    invalid={!fieldValidity.heroTextColorOverride}
                  />
                </div>
              </div>
            </div>
          </div>

          <CampaignBrandingSpecimen
            brandingConfig={previewBranding}
            organisationName={draft.companyName.trim() || 'Client brand'}
            description="This should feel like the actual participant system: a stronger hero gradient, calmer canvas-led support surfaces, and CTA colours that stay distinct from the main panels."
          />
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-5 shadow-[0_22px_60px_rgba(15,23,42,0.05)] md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm ${statusTone}`}>{statusMessage}</p>
          {saveError && !hasInvalidColors ? (
            <button
              type="button"
              onClick={() => {
                void persistBranding(draftPatch, saveKey)
              }}
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
