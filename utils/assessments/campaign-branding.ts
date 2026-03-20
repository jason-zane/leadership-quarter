import {
  type CampaignConfig,
  normalizeCampaignConfig,
} from '@/utils/assessments/campaign-types'
import {
  buildBrandCssOverrides,
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
    branding_enabled: true,
    logo_url: campaignConfig.branding_logo_url ?? orgBranding.logo_url,
    favicon_url: null,
    primary_color: campaignConfig.branding_primary_color ?? orgBranding.primary_color,
    secondary_color: campaignConfig.branding_secondary_color ?? orgBranding.secondary_color,
    company_name: campaignConfig.branding_company_name ?? orgBranding.company_name,
    show_lq_attribution: orgBranding.show_lq_attribution,
  } satisfies OrgBrandingConfig
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
    return {
      mode: 'lq',
      logoUrl: null,
      displayName: 'Leadership Quarter',
      cssOverrides: '',
      showAttribution: false,
      isLQFallback: true,
    }
  }

  const orgBranding = normalizeOrgBrandingConfig(input.organisation?.branding_config ?? null)
  const mergedBranding = buildMergedOrgBranding({ orgBranding, campaignConfig: config })

  const usesOrgLogo = !config.branding_logo_url && !!orgBranding.logo_url
  const usesOrgName = !config.branding_company_name && !!(orgBranding.company_name || input.organisation?.name)
  const usesOrgPrimary = !config.branding_primary_color && !!orgBranding.primary_color
  const usesOrgSecondary = !config.branding_secondary_color && !!orgBranding.secondary_color
  const usesOrgFallback = orgBranding.branding_enabled && (usesOrgLogo || usesOrgName || usesOrgPrimary || usesOrgSecondary)

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
