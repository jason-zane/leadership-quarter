import { describe, expect, it } from 'vitest'
import { resolveCampaignBranding } from '@/utils/assessments/campaign-branding'
import {
  buildBrandCssOverrides,
  LQ_PRESETS,
  normalizeOrgBrandingConfig,
} from '@/utils/brand/org-brand-utils'

describe('campaign branding theme generation', () => {
  it('builds full participant theme overrides from custom brand colors', () => {
    const css = buildBrandCssOverrides(normalizeOrgBrandingConfig({
      branding_enabled: true,
      logo_url: null,
      favicon_url: null,
      primary_cta_color: '#1f5d8f',
      secondary_cta_accent_color: '#d38a52',
      canvas_tint_color: '#eef3f8',
      hero_gradient_start_color: '#1f5d8f',
      hero_gradient_end_color: '#d38a52',
      company_name: 'Acme Leadership',
      show_lq_attribution: true,
    }))

    expect(css).toContain('--site-brand-primary-cta: #1f5d8f;')
    expect(css).toContain('--site-brand-secondary-cta: #d38a52;')
    expect(css).toContain('--site-brand-canvas: #eef3f8;')
    expect(css).toContain('--site-cta-bg: #1f5d8f;')
    expect(css).toContain('--site-panel-hero-bg: linear-gradient(135deg, #1f5d8f 0%, #d38a52 100%);')
    expect(css).toContain('--site-header-bg:')
    expect(css).toContain('--site-panel-card-bg:')
    expect(css).toContain('--site-panel-callout-bg:')
    expect(css).toContain('--site-button-secondary-bg:')
    expect(css).toContain('--site-progress-fill:')
    expect(css).toContain('--site-form-bg:')
  })

  it('keeps achromatic theme inputs neutral instead of tinting them', () => {
    const css = buildBrandCssOverrides(normalizeOrgBrandingConfig({
      branding_enabled: true,
      logo_url: null,
      favicon_url: null,
      hero_gradient_start_color: '#ffffff',
      hero_gradient_end_color: '#ffffff',
      canvas_tint_color: '#ffffff',
      primary_cta_color: '#ffffff',
      secondary_cta_accent_color: '#ffffff',
      company_name: 'Neutral Org',
      show_lq_attribution: true,
    }))

    expect(css).toContain('--site-brand-hero-start: #ffffff;')
    expect(css).toContain('--site-brand-hero-end: #ffffff;')
    expect(css).toContain('--site-brand-canvas: #ffffff;')
    expect(css).toContain('--site-brand-primary-cta: #ffffff;')
    expect(css).toContain('--site-brand-secondary-cta: #ffffff;')
    expect(css).toContain('--site-panel-hero-bg: linear-gradient(135deg, #ffffff 0%, #ffffff 100%);')
  })

  it('resolves custom campaign branding using campaign overrides and organisation fallback', () => {
    const resolved = resolveCampaignBranding({
      config: {
        branding_mode: 'custom',
        branding_primary_color: '#0f4b77',
        branding_secondary_color: '#c99657',
        branding_company_name: null,
        branding_logo_url: null,
      },
      organisation: {
        name: 'Client Org',
        branding_config: {
          branding_enabled: true,
          logo_url: 'https://cdn.example.com/logo.svg',
          primary_color: '#235d93',
          secondary_color: '#dda86d',
          company_name: 'Client Org',
          show_lq_attribution: true,
        },
      },
    })

    expect(resolved.mode).toBe('custom')
    expect(resolved.displayName).toBe('Client Org')
    expect(resolved.logoUrl).toBe('https://cdn.example.com/logo.svg')
    expect(resolved.cssOverrides).toContain('--site-cta-bg: #0f4b77;')
    expect(resolved.cssOverrides).toContain('--site-accent-pop: #c99657;')
    expect(resolved.cssOverrides).toContain('--site-panel-card-bg:')
  })

  it('accent-strong derives from primary only, not secondary', () => {
    const css = buildBrandCssOverrides(normalizeOrgBrandingConfig({
      branding_enabled: true,
      primary_cta_color: '#2f5f99',
      secondary_cta_accent_color: '#ff0000',
      hero_gradient_start_color: '#254d7e',
      hero_gradient_end_color: '#5f87b8',
      canvas_tint_color: '#f7f4ee',
    }))

    expect(css).toContain('--site-accent-strong: #2f5f99;')
    expect(css).not.toMatch(/--site-accent-strong:.*ff/)
  })

  it('generates CSS overrides for LQ light variant', () => {
    const resolved = resolveCampaignBranding({
      config: {
        branding_mode: 'lq',
        branding_lq_variant: 'light',
      },
      organisation: null,
    })

    expect(resolved.mode).toBe('lq')
    expect(resolved.cssOverrides).toContain('--site-cta-bg:')
    expect(resolved.cssOverrides).toContain(`--site-brand-hero-start: ${LQ_PRESETS.light.heroGradientStart};`)
  })

  it('returns empty CSS overrides for LQ dark variant (uses globals.css defaults)', () => {
    const resolved = resolveCampaignBranding({
      config: {
        branding_mode: 'lq',
        branding_lq_variant: 'dark',
      },
      organisation: null,
    })

    expect(resolved.mode).toBe('lq')
    expect(resolved.cssOverrides).toBe('')
  })

  it('LQ dark preset pipeline matches key globals.css variables', () => {
    const preset = LQ_PRESETS.dark
    const css = buildBrandCssOverrides(normalizeOrgBrandingConfig({
      branding_enabled: true,
      hero_gradient_start_color: preset.heroGradientStart,
      hero_gradient_end_color: preset.heroGradientEnd,
      canvas_tint_color: preset.canvasTint,
      primary_cta_color: preset.primaryCta,
      secondary_cta_accent_color: preset.secondaryAccent,
    }))

    expect(css).toContain('--site-cta-bg: #2f5f99;')
    expect(css).toContain('--site-panel-hero-bg: linear-gradient(135deg, #254d7e 0%, #5f87b8 100%);')
    expect(css).toContain('--site-accent-strong: #2f5f99;')
  })
})
