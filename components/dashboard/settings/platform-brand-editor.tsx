'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAutoSave } from '@/components/dashboard/hooks/use-auto-save'
import { AutoSaveStatus } from '@/components/dashboard/ui/auto-save-status'
import { ColorField } from '@/components/dashboard/ui/color-field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { AssessmentExperiencePreview } from '@/components/dashboard/assessments/experience-preview-core'
import { BrandAwarePreviewShell } from '@/components/dashboard/assessments/brand-aware-preview-shell'
import {
  getEffectiveSeedColors,
  LQ_BRAND_CONFIG,
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

type PreviewTab = 'assessment' | 'registration' | 'report'

const PREVIEW_TABS: Array<{ key: PreviewTab; label: string }> = [
  { key: 'assessment', label: 'Assessment flow' },
  { key: 'registration', label: 'Registration' },
  { key: 'report', label: 'Report card' },
]

type BrandDraft = {
  heroGradientStartColor: string
  heroGradientEndColor: string
  canvasTintColor: string
  primaryCtaColor: string
  secondaryAccentColor: string
  heroTextColorOverride: string
}

function configToDraft(config: OrgBrandingConfig): BrandDraft {
  return {
    heroGradientStartColor: config.hero_gradient_start_color ?? '',
    heroGradientEndColor: config.hero_gradient_end_color ?? '',
    canvasTintColor: config.canvas_tint_color ?? '',
    primaryCtaColor: config.primary_cta_color ?? '',
    secondaryAccentColor: config.secondary_cta_accent_color ?? '',
    heroTextColorOverride: config.hero_text_color_override ?? '',
  }
}

function draftToConfig(draft: BrandDraft): OrgBrandingConfig {
  return {
    theme_version: 1,
    branding_enabled: true,
    logo_url: null,
    favicon_url: null,
    hero_gradient_start_color: draft.heroGradientStartColor.trim() || null,
    hero_gradient_end_color: draft.heroGradientEndColor.trim() || null,
    canvas_tint_color: draft.canvasTintColor.trim() || null,
    primary_cta_color: draft.primaryCtaColor.trim() || null,
    secondary_cta_accent_color: draft.secondaryAccentColor.trim() || null,
    hero_text_color_override: draft.heroTextColorOverride.trim() || null,
    company_name: 'Leadership Quarter',
    show_lq_attribution: false,
    primary_color: null,
    secondary_color: null,
    surface_tint_color: null,
    hero_surface_color: null,
  }
}

function isOptionalHexValid(value: string) {
  return !value.trim() || validateHexColor(value.trim())
}

export function PlatformBrandEditor() {
  const [draft, setDraft] = useState<BrandDraft>(() => configToDraft(LQ_BRAND_CONFIG))
  const [previewTab, setPreviewTab] = useState<PreviewTab>('assessment')
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)

  const previewConfig = useMemo(() => draftToConfig(draft), [draft])

  const fieldValidity = useMemo(() => ({
    heroGradientStartColor: isOptionalHexValid(draft.heroGradientStartColor),
    heroGradientEndColor: isOptionalHexValid(draft.heroGradientEndColor),
    canvasTintColor: isOptionalHexValid(draft.canvasTintColor),
    primaryCtaColor: isOptionalHexValid(draft.primaryCtaColor),
    secondaryAccentColor: isOptionalHexValid(draft.secondaryAccentColor),
    heroTextColorOverride: isOptionalHexValid(draft.heroTextColorOverride),
  }), [draft])

  const effectiveColors = useMemo(
    () => getEffectiveSeedColors(previewConfig),
    [previewConfig]
  )

  const hasInvalidColors = Object.values(fieldValidity).some((v) => !v)

  const validate = useCallback(
    (data: BrandDraft) => {
      const config = draftToConfig(data)
      const hexFields = [
        config.hero_gradient_start_color,
        config.hero_gradient_end_color,
        config.canvas_tint_color,
        config.primary_cta_color,
        config.secondary_cta_accent_color,
        config.hero_text_color_override,
      ]
      for (const val of hexFields) {
        if (val && !validateHexColor(val)) return 'Fix invalid hex values.'
      }
      return null
    },
    []
  )

  const onSave = useCallback(async (data: BrandDraft) => {
    const config = draftToConfig(data)
    const res = await fetch('/api/admin/settings/brand', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: config }),
    })
    const body = (await res.json().catch(() => null)) as {
      ok?: boolean
      error?: string
      brand?: unknown
    } | null
    if (!res.ok || !body?.ok) {
      throw new Error(body?.error ?? 'Failed to save platform brand.')
    }
  }, [])

  const { status, error, savedAt, saveNow, markSaved } = useAutoSave({
    data: draft,
    onSave,
    validate,
    saveOn: 'blur',
  })

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/settings/brand', { cache: 'no-store' })
        const body = (await res.json().catch(() => null)) as {
          ok?: boolean
          brand?: unknown
        } | null
        if (!active) return
        if (body?.ok && body.brand) {
          const config = normalizeOrgBrandingConfig(body.brand)
          const d = configToDraft(config)
          setDraft(d)
          markSaved(d)
        }
      } catch {
        // Falls back to LQ defaults
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [markSaved])

  async function handleReset() {
    setResetting(true)
    try {
      const res = await fetch('/api/admin/settings/brand/reset', { method: 'POST' })
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean
        brand?: unknown
      } | null
      if (body?.ok && body.brand) {
        const config = normalizeOrgBrandingConfig(body.brand)
        const d = configToDraft(config)
        setDraft(d)
        markSaved(d)
      }
    } catch {
      // silent
    } finally {
      setResetting(false)
    }
  }

  function updateDraft<K extends keyof BrandDraft>(key: K, value: BrandDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  if (loading) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading platform brand...</p>
  }

  // Mock configs for assessment preview
  const mockRunnerConfig = normalizeRunnerConfig({
    title: 'AI Readiness Orientation',
    subtitle: 'Understand how you currently approach AI-supported leadership.',
    intro: 'Leadership assessment',
    estimated_minutes: 8,
    start_cta_label: 'Begin assessment',
    completion_screen_title: 'Assessment complete',
    completion_screen_body: 'Your report is ready to view.',
    completion_screen_cta_label: 'View your report',
  })
  const mockReportConfig = normalizeReportConfig({})

  return (
    <div className="space-y-6">
      <FoundationSurface className="space-y-6 p-6 md:p-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Palette</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">
            Set the five seed colours that define the default LQ experience
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
            Every candidate-facing surface, report, and assessment flow derives its full visual treatment from these seeds. The system generates 70+ CSS variables from them automatically.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Hero and stage</p>
            <h3 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">The two colours used for stronger gradient surfaces</h3>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <ColorField
              label="Hero gradient start"
              value={draft.heroGradientStartColor}
              onChange={(v) => { updateDraft('heroGradientStartColor', v); void saveNow() }}
              onBlur={() => void saveNow()}
              placeholder="#254d7e"
              helper="Used for hero panels, branded stage moments, and the start of stronger gradients."
              fallback="#254d7e"
              invalid={!fieldValidity.heroGradientStartColor}
              adjustedTo={effectiveColors.heroStart.adjusted ? effectiveColors.heroStart.effective : null}
            />
            <ColorField
              label="Hero gradient end"
              value={draft.heroGradientEndColor}
              onChange={(v) => { updateDraft('heroGradientEndColor', v); void saveNow() }}
              onBlur={() => void saveNow()}
              placeholder="#5f87b8"
              helper="Used for the end of the hero gradient so it has depth without becoming noisy."
              fallback="#5f87b8"
              invalid={!fieldValidity.heroGradientEndColor}
              adjustedTo={effectiveColors.heroEnd.adjusted ? effectiveColors.heroEnd.effective : null}
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Actions and surfaces</p>
            <h3 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">Canvas, primary CTA, and secondary accent</h3>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <ColorField
              label="Canvas tint"
              value={draft.canvasTintColor}
              onChange={(v) => { updateDraft('canvasTintColor', v); void saveNow() }}
              onBlur={() => void saveNow()}
              placeholder="#f5f6f9"
              helper="Page backgrounds, support panels, and form surfaces."
              fallback="#f5f6f9"
              invalid={!fieldValidity.canvasTintColor}
              adjustedTo={effectiveColors.canvas.adjusted ? effectiveColors.canvas.effective : null}
            />
            <ColorField
              label="Primary CTA"
              value={draft.primaryCtaColor}
              onChange={(v) => { updateDraft('primaryCtaColor', v); void saveNow() }}
              onBlur={() => void saveNow()}
              placeholder="#2f5f99"
              helper="Main call to action, active states, progress anchors."
              fallback="#2f5f99"
              invalid={!fieldValidity.primaryCtaColor}
              adjustedTo={effectiveColors.primary.adjusted ? effectiveColors.primary.effective : null}
            />
            <ColorField
              label="Secondary accent"
              value={draft.secondaryAccentColor}
              onChange={(v) => { updateDraft('secondaryAccentColor', v); void saveNow() }}
              onBlur={() => void saveNow()}
              placeholder="#7ca8d6"
              helper="Softer buttons, highlights, and progress bar end colour."
              fallback="#7ca8d6"
              invalid={!fieldValidity.secondaryAccentColor}
              adjustedTo={effectiveColors.secondary.adjusted ? effectiveColors.secondary.effective : null}
            />
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.72)] p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--admin-text-soft)]">Advanced</p>
            <h3 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">Override the hero text colour only if auto contrast is not enough</h3>
          </div>
          <div className="mt-5 max-w-xl">
            <ColorField
              label="Hero text override"
              value={draft.heroTextColorOverride}
              onChange={(v) => { updateDraft('heroTextColorOverride', v); void saveNow() }}
              onBlur={() => void saveNow()}
              placeholder="#ffffff"
              helper="Leave blank to let the system choose text colour from the hero gradient."
              fallback="#ffffff"
              invalid={!fieldValidity.heroTextColorOverride}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-white p-4">
          <div className="flex items-center gap-4">
            <AutoSaveStatus status={status} error={error} savedAt={savedAt} onRetry={() => void saveNow()} />
            {hasInvalidColors ? (
              <p className="text-sm text-amber-600">Fix highlighted hex values to keep autosave running.</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting}
            className="foundation-btn foundation-btn-secondary px-4 py-2 text-sm"
          >
            {resetting ? 'Resetting...' : 'Reset to factory defaults'}
          </button>
        </div>
      </FoundationSurface>

      <FoundationSurface className="space-y-5 p-6 md:p-7">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Live preview</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--admin-text-primary)]">
            See how these seeds render across candidate-facing surfaces
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--admin-text-muted)]">
            Every preview uses the same theme engine and CSS variable injection as the production candidate experience.
          </p>
        </div>

        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Brand preview surfaces">
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

        {previewTab === 'assessment' ? (
          <AssessmentExperiencePreview
            runnerConfig={mockRunnerConfig}
            reportConfig={mockReportConfig}
            experienceConfig={DEFAULT_ASSESSMENT_EXPERIENCE_CONFIG}
            brandingConfig={previewConfig}
            fullWidth
          />
        ) : null}

        {previewTab === 'registration' ? (
          <BrandAwarePreviewShell brandingConfig={previewConfig}>
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

                <div className="mt-8 space-y-5 border-t border-[rgba(120,144,170,0.12)] pt-6">
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
          <BrandAwarePreviewShell brandingConfig={previewConfig}>
            <div className="rounded-[1.5rem] p-6 md:p-8">
              <div className="space-y-5">
                {/* Hero — matches AssessmentReportHero (site-card-strong + assessment-web-report-hero) */}
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

                {/* Classification hero — matches report-preview-block hero section */}
                <div className="assessment-report-section-card assessment-report-section-card-hero rounded-[28px] border border-[var(--site-report-section-border)] [background:var(--site-report-hero-section-bg)] p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--site-text-secondary)]">Your profile</p>
                  <h3 className="mt-2.5 font-serif text-[clamp(1.6rem,3.5vw,2.4rem)] leading-[1.05] text-[var(--site-text-primary)]">
                    Strategic Integrator
                  </h3>
                  <p className="mt-3 max-w-2xl text-base text-[var(--site-text-body)]">
                    You approach AI adoption with a strategic mindset, balancing opportunity with practical constraints.
                  </p>
                </div>

                {/* Dimension score cards — matches report-preview-block score_cards */}
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

                {/* Bar chart section — matches report-preview-block bar_chart format */}
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

                {/* Insight list — matches report-preview-block insight_list format */}
                <div className="assessment-report-section-card rounded-[26px] border border-[var(--site-report-section-border)] [background:var(--site-report-section-bg)] p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--site-text-secondary)]">Insights</p>
                  <h3 className="mt-2.5 font-serif text-[clamp(1.55rem,2.3vw,2.05rem)] leading-[1.08] text-[var(--site-text-primary)]">
                    What your results mean
                  </h3>
                  <div className="mt-5 space-y-3">
                    <div className="assessment-report-item-card rounded-[22px] border border-[var(--site-report-section-border)] [background:var(--site-panel-card-bg)] px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--site-text-primary)]">Strategic strength</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--site-text-body)]">
                        Your strategic vision score suggests strong comfort with AI planning.
                      </p>
                    </div>
                    <div className="assessment-report-item-card rounded-[22px] border border-[var(--site-report-section-border)] [background:var(--site-panel-card-bg)] px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--site-text-primary)]">Development focus</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--site-text-body)]">
                        Practical integration presents the best development opportunity.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA — matches report-preview-block ReportCtaBlock */}
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
      </FoundationSurface>
    </div>
  )
}
