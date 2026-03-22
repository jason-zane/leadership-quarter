import {
  type CampaignConfig,
  normalizeCampaignConfig,
} from '@/utils/assessments/campaign-types'
import {
  buildBrandCssOverrides,
  LQ_PRESETS,
  normalizeOrgBrandingConfig,
  type OrgBrandingConfig,
} from '@/utils/brand/org-brand-utils'

type OrganisationBrandingInput = {
  name?: string | null
  branding_config?: unknown
} | null

export type ResolvedCampaignBranding = {
  mode: 'lq' | 'none' | 'custom'
  logoUrl: string | null
  displayName: string
  cssOverrides: string
  showAttribution: boolean
  isLQFallback: boolean
}

function buildMergedOrgBranding(input: {
  orgBranding: OrgBrandingConfig
  campaignConfig: CampaignConfig
}) {
  const { orgBranding, campaignConfig } = input

  return {
    theme_version: 1,
    branding_enabled: true,
    logo_url: campaignConfig.branding_logo_url ?? orgBranding.logo_url,
    favicon_url: null,
    hero_gradient_start_color:
      campaignConfig.branding_hero_surface_color
      ?? orgBranding.hero_gradient_start_color
      ?? orgBranding.hero_surface_color,
    hero_gradient_end_color:
      orgBranding.hero_gradient_end_color
      ?? orgBranding.secondary_cta_accent_color
      ?? orgBranding.secondary_color,
    canvas_tint_color:
      campaignConfig.branding_surface_tint_color
      ?? orgBranding.canvas_tint_color
      ?? orgBranding.surface_tint_color,
    primary_cta_color:
      campaignConfig.branding_primary_color
      ?? orgBranding.primary_cta_color
      ?? orgBranding.primary_color,
    secondary_cta_accent_color:
      campaignConfig.branding_secondary_color
      ?? orgBranding.secondary_cta_accent_color
      ?? orgBranding.secondary_color,
    hero_text_color_override: orgBranding.hero_text_color_override,
    primary_color: campaignConfig.branding_primary_color ?? orgBranding.primary_color,
    secondary_color: campaignConfig.branding_secondary_color ?? orgBranding.secondary_color,
    surface_tint_color: campaignConfig.branding_surface_tint_color ?? orgBranding.surface_tint_color,
    hero_surface_color: campaignConfig.branding_hero_surface_color ?? orgBranding.hero_surface_color,
    company_name: campaignConfig.branding_company_name ?? orgBranding.company_name,
    show_lq_attribution: campaignConfig.branding_show_lq_attribution ?? orgBranding.show_lq_attribution,
  } satisfies OrgBrandingConfig
}

export function resolveOrganisationBrandingPreview(input: {
  organisation: OrganisationBrandingInput
}): ResolvedCampaignBranding {
  const orgBranding = normalizeOrgBrandingConfig(input.organisation?.branding_config ?? null)
  const displayName =
    orgBranding.company_name
    ?? input.organisation?.name
    ?? 'Leadership Quarter'
  const isLQFallback = !orgBranding.logo_url && !orgBranding.company_name

  return {
    mode: orgBranding.branding_enabled ? 'custom' : 'lq',
    logoUrl: orgBranding.logo_url ?? null,
    displayName,
    cssOverrides: orgBranding.branding_enabled ? buildBrandCssOverrides(orgBranding) : '',
    showAttribution: orgBranding.branding_enabled && orgBranding.show_lq_attribution,
    isLQFallback,
  }
}

export function resolveCampaignBranding(input: {
  config: unknown
  organisation: OrganisationBrandingInput
}): ResolvedCampaignBranding {
  const config = normalizeCampaignConfig(input.config)
  const mode = config.branding_mode

  if (mode === 'none') {
    return {
      mode: 'none',
      logoUrl: null,
      displayName: '',
      cssOverrides: '',
      showAttribution: false,
      isLQFallback: false,
    }
  }

  if (mode === 'lq') {
    const variant = config.branding_lq_variant ?? 'light'
    let cssOverrides = ''
    if (variant === 'light') {
      const preset = LQ_PRESETS.light
      cssOverrides = buildBrandCssOverrides({
        theme_version: 1,
        branding_enabled: true,
        logo_url: null,
        favicon_url: null,
        hero_gradient_start_color: preset.heroGradientStart,
        hero_gradient_end_color: preset.heroGradientEnd,
        canvas_tint_color: preset.canvasTint,
        primary_cta_color: preset.primaryCta,
        secondary_cta_accent_color: preset.secondaryAccent,
        hero_text_color_override: null,
        company_name: null,
        show_lq_attribution: false,
        primary_color: null,
        secondary_color: null,
        surface_tint_color: null,
        hero_surface_color: null,
      })
    }
    return {
      mode: 'lq',
      logoUrl: null,
      displayName: 'Leadership Quarter',
      cssOverrides,
      showAttribution: false,
      isLQFallback: true,
    }
  }

  const orgBranding = normalizeOrgBrandingConfig(input.organisation?.branding_config ?? null)
  const mergedBranding = buildMergedOrgBranding({ orgBranding, campaignConfig: config })

  const usesOrgLogo = !config.branding_logo_url && !!orgBranding.logo_url
  const usesOrgName = !config.branding_company_name && !!(orgBranding.company_name || input.organisation?.name)
  const usesOrgPrimary =
    !config.branding_primary_color
    && !!(orgBranding.primary_cta_color || orgBranding.primary_color)
  const usesOrgSecondary =
    !config.branding_secondary_color
    && !!(orgBranding.secondary_cta_accent_color || orgBranding.secondary_color)
  const usesOrgSurfaceTint =
    !config.branding_surface_tint_color
    && !!(orgBranding.canvas_tint_color || orgBranding.surface_tint_color)
  const usesOrgHeroSurface =
    !config.branding_hero_surface_color
    && !!(orgBranding.hero_gradient_start_color || orgBranding.hero_surface_color)
  const usesOrgFallback =
    orgBranding.branding_enabled
    && (usesOrgLogo || usesOrgName || usesOrgPrimary || usesOrgSecondary || usesOrgSurfaceTint || usesOrgHeroSurface)

  const logoUrl = mergedBranding.logo_url
  const companyName = mergedBranding.company_name ?? input.organisation?.name ?? null
  const displayName = companyName ?? 'Leadership Quarter'
  const isLQFallback = !logoUrl && !companyName

  return {
    mode: 'custom',
    logoUrl,
    displayName,
    cssOverrides: buildBrandCssOverrides(mergedBranding),
    showAttribution: usesOrgFallback && orgBranding.show_lq_attribution,
    isLQFallback,
  }
}
