export type OrgBrandingConfig = {
  branding_enabled: boolean
  logo_url: string | null
  favicon_url: string | null
  primary_color: string | null
  secondary_color: string | null
  company_name: string | null
  show_lq_attribution: boolean
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function validateHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value)
}

export function normalizeOrgBrandingConfig(raw: unknown): OrgBrandingConfig {
  if (!raw || typeof raw !== 'object') {
    return emptyBrandingConfig()
  }
  const r = raw as Record<string, unknown>
  return {
    branding_enabled: r.branding_enabled === true,
    logo_url: typeof r.logo_url === 'string' ? r.logo_url : null,
    favicon_url: typeof r.favicon_url === 'string' ? r.favicon_url : null,
    primary_color:
      typeof r.primary_color === 'string' && validateHexColor(r.primary_color)
        ? r.primary_color
        : null,
    secondary_color:
      typeof r.secondary_color === 'string' && validateHexColor(r.secondary_color)
        ? r.secondary_color
        : null,
    company_name: typeof r.company_name === 'string' ? r.company_name : null,
    show_lq_attribution: r.show_lq_attribution !== false,
  }
}

export function emptyBrandingConfig(): OrgBrandingConfig {
  return {
    branding_enabled: false,
    logo_url: null,
    favicon_url: null,
    primary_color: null,
    secondary_color: null,
    company_name: null,
    show_lq_attribution: true,
  }
}

export function hasBranding(config: OrgBrandingConfig): boolean {
  return config.branding_enabled && !!(config.logo_url || config.primary_color)
}

export function buildBrandCssOverrides(config: OrgBrandingConfig): string {
  if (!config.branding_enabled) return ''
  const lines: string[] = []
  if (config.primary_color) {
    lines.push(`--site-primary: ${config.primary_color};`)
    lines.push(`--site-primary-hover: ${config.primary_color};`)
    lines.push(`--site-cta-bg: ${config.primary_color};`)
    lines.push(`--site-cta-hover-bg: ${config.primary_color};`)
    lines.push(`--site-cta-active-bg: ${config.primary_color};`)
    lines.push(`--site-accent: ${config.primary_color};`)
    lines.push(`--site-accent-strong: ${config.primary_color};`)
    lines.push(`--site-link: ${config.primary_color};`)
    lines.push(`--site-link-hover: ${config.primary_color};`)
  }
  if (config.secondary_color) {
    lines.push(`--site-accent-pop: ${config.secondary_color};`)
  }
  return lines.join('\n')
}
