'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
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

type Props = {
  organisationId: string
  initialBranding: OrgBrandingConfig
}

type BrandTab = 'identity' | 'palette'
type PreviewTab = 'assessment' | 'registration' | 'report'

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
  const [previewTab, setPreviewTab] = useState<PreviewTab>('assessment')
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

          <div className="rounded-[2rem] border border-[rgba(103,127,159,0.14)] bg-white px-6 py-6 shadow-[0_24px_72px_rgba(15,23,42,0.05)] md:px-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Live preview</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">
                See how these seeds render across candidate-facing surfaces
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
                Every preview uses the same theme engine and CSS variable injection as the production candidate experience.
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
