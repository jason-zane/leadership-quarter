export type OrgBrandingConfig = {
  theme_version: 1
  branding_enabled: boolean
  logo_url: string | null
  favicon_url: string | null
  hero_gradient_start_color: string | null
  hero_gradient_end_color: string | null
  canvas_tint_color: string | null
  primary_cta_color: string | null
  secondary_cta_accent_color: string | null
  hero_text_color_override: string | null
  company_name: string | null
  show_lq_attribution: boolean
  primary_color: string | null
  secondary_color: string | null
  surface_tint_color: string | null
  hero_surface_color: string | null
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const LQ_PRESETS = {
  light: {
    heroGradientStart: '#d4e2f0',
    heroGradientEnd: '#e8f0f8',
    canvasTint: '#f8f9fb',
    primaryCta: '#2f5f99',
    secondaryAccent: '#7ca8d6',
  },
  dark: {
    heroGradientStart: '#254d7e',
    heroGradientEnd: '#5f87b8',
    canvasTint: '#f5f6f9',
    primaryCta: '#2f5f99',
    secondaryAccent: '#7ca8d6',
  },
} as const

const LQ_THEME_BASE = LQ_PRESETS.dark

type Rgb = {
  r: number
  g: number
  b: number
}

type Hsl = {
  h: number
  s: number
  l: number
}

export function validateHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value)
}

function normalizeOptionalHex(value: unknown): string | null {
  return typeof value === 'string' && validateHexColor(value) ? normalizeHex(value) : null
}

export function normalizeOrgBrandingConfig(raw: unknown): OrgBrandingConfig {
  if (!raw || typeof raw !== 'object') {
    return emptyBrandingConfig()
  }

  const record = raw as Record<string, unknown>

  return {
    theme_version: 1,
    branding_enabled: record.branding_enabled === true,
    logo_url: typeof record.logo_url === 'string' ? record.logo_url : null,
    favicon_url: typeof record.favicon_url === 'string' ? record.favicon_url : null,
    hero_gradient_start_color: normalizeOptionalHex(record.hero_gradient_start_color),
    hero_gradient_end_color: normalizeOptionalHex(record.hero_gradient_end_color),
    canvas_tint_color: normalizeOptionalHex(record.canvas_tint_color),
    primary_cta_color: normalizeOptionalHex(record.primary_cta_color),
    secondary_cta_accent_color: normalizeOptionalHex(record.secondary_cta_accent_color),
    hero_text_color_override: normalizeOptionalHex(record.hero_text_color_override),
    company_name: typeof record.company_name === 'string' ? record.company_name : null,
    show_lq_attribution: record.show_lq_attribution !== false,
    primary_color: normalizeOptionalHex(record.primary_color),
    secondary_color: normalizeOptionalHex(record.secondary_color),
    surface_tint_color: normalizeOptionalHex(record.surface_tint_color),
    hero_surface_color: normalizeOptionalHex(record.hero_surface_color),
  }
}

export function emptyBrandingConfig(): OrgBrandingConfig {
  return {
    theme_version: 1,
    branding_enabled: false,
    logo_url: null,
    favicon_url: null,
    hero_gradient_start_color: null,
    hero_gradient_end_color: null,
    canvas_tint_color: null,
    primary_cta_color: null,
    secondary_cta_accent_color: null,
    hero_text_color_override: null,
    company_name: null,
    show_lq_attribution: true,
    primary_color: null,
    secondary_color: null,
    surface_tint_color: null,
    hero_surface_color: null,
  }
}

export function hasBranding(config: OrgBrandingConfig): boolean {
  return config.branding_enabled && Boolean(
    config.logo_url
    || config.company_name
    || config.hero_gradient_start_color
    || config.hero_gradient_end_color
    || config.canvas_tint_color
    || config.primary_cta_color
    || config.secondary_cta_accent_color
    || config.primary_color
    || config.secondary_color
    || config.surface_tint_color
    || config.hero_surface_color
  )
}

function normalizeHex(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
  }
  return trimmed
}

function hexToRgb(value: string): Rgb {
  const normalized = normalizeHex(value).slice(1)
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(rgb: Rgb): string {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2

  if (max === min) {
    return { h: 0, s: 0, l: lightness }
  }

  const delta = max - min
  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min)

  let hue = 0
  switch (max) {
    case red:
      hue = ((green - blue) / delta) + (green < blue ? 6 : 0)
      break
    case green:
      hue = ((blue - red) / delta) + 2
      break
    default:
      hue = ((red - green) / delta) + 4
      break
  }

  return { h: hue / 6, s: saturation, l: lightness }
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  if (s === 0) {
    const channel = l * 255
    return { r: channel, g: channel, b: channel }
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let next = t
    if (next < 0) next += 1
    if (next > 1) next -= 1
    if (next < 1 / 6) return p + ((q - p) * 6 * next)
    if (next < 1 / 2) return q
    if (next < 2 / 3) return p + ((q - p) * ((2 / 3) - next) * 6)
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - (l * s)
  const p = 2 * l - q

  return {
    r: hueToRgb(p, q, h + (1 / 3)) * 255,
    g: hueToRgb(p, q, h) * 255,
    b: hueToRgb(p, q, h - (1 / 3)) * 255,
  }
}

function mixColors(base: string, blend: string, amount: number): string {
  const from = hexToRgb(base)
  const to = hexToRgb(blend)
  const weight = clamp(amount, 0, 1)

  return rgbToHex({
    r: from.r + (to.r - from.r) * weight,
    g: from.g + (to.g - from.g) * weight,
    b: from.b + (to.b - from.b) * weight,
  })
}

function darken(color: string, amount: number): string {
  return mixColors(color, '#0f1724', amount)
}

function lighten(color: string, amount: number): string {
  return mixColors(color, '#ffffff', amount)
}

function withAlpha(color: string, alpha: number): string {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function relativeLuminance(color: string): number {
  const { r, g, b } = hexToRgb(color)
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2])
}

function readableText(color: string): string {
  return relativeLuminance(color) > 0.42 ? '#112033' : '#ffffff'
}

function isAchromatic(color: string): boolean {
  return rgbToHsl(hexToRgb(color)).s <= 0.03
}

function normalizeSeedColor(
  color: string,
  limits: {
    lightness: [number, number]
    saturation?: [number, number]
    preserveAchromatic?: boolean
  }
): string {
  const hsl = rgbToHsl(hexToRgb(color))
  const achromatic = hsl.s <= 0.03

  if (achromatic && limits.preserveAchromatic) {
    return rgbToHex(hslToRgb({
      h: 0,
      s: 0,
      l: clamp(hsl.l, limits.lightness[0], limits.lightness[1]),
    }))
  }

  return rgbToHex(hslToRgb({
    h: hsl.h,
    s: limits.saturation
      ? clamp(hsl.s, limits.saturation[0], limits.saturation[1])
      : hsl.s,
    l: clamp(hsl.l, limits.lightness[0], limits.lightness[1]),
  }))
}

function resolveThemeInputs(config: OrgBrandingConfig) {
  const primarySeed = normalizeHex(
    config.primary_cta_color
      ?? config.primary_color
      ?? LQ_THEME_BASE.primaryCta
  )
  const secondarySeed = normalizeHex(
    config.secondary_cta_accent_color
      ?? config.secondary_color
      ?? LQ_THEME_BASE.secondaryAccent
  )
  const canvasSeed = normalizeHex(
    config.canvas_tint_color
      ?? config.surface_tint_color
      ?? LQ_THEME_BASE.canvasTint
  )
  const heroStartSeed = normalizeHex(
    config.hero_gradient_start_color
      ?? config.hero_surface_color
      ?? LQ_THEME_BASE.heroGradientStart
  )
  const heroEndSeed = normalizeHex(
    config.hero_gradient_end_color
      ?? LQ_THEME_BASE.heroGradientEnd
  )

  return {
    primarySeed,
    secondarySeed,
    canvasSeed,
    heroStartSeed,
    heroEndSeed,
    primary: normalizeSeedColor(primarySeed, {
      lightness: [0.10, 1],
      preserveAchromatic: true,
    }),
    secondary: normalizeSeedColor(secondarySeed, {
      lightness: [0.10, 1],
      preserveAchromatic: true,
    }),
    canvas: normalizeSeedColor(canvasSeed, {
      lightness: [0.78, 1],
      saturation: [0.0, 0.28],
      preserveAchromatic: true,
    }),
    heroStart: normalizeSeedColor(heroStartSeed, {
      lightness: [0.12, 1],
      saturation: [0.0, 0.82],
      preserveAchromatic: true,
    }),
    heroEnd: normalizeSeedColor(heroEndSeed, {
      lightness: [0.12, 1],
      saturation: [0.0, 0.82],
      preserveAchromatic: true,
    }),
  }
}

export function buildBrandCssOverrides(config: OrgBrandingConfig): string {
  if (!config.branding_enabled) return ''

  const {
    primarySeed,
    secondarySeed,
    canvasSeed,
    heroStartSeed,
    heroEndSeed,
    primary,
    secondary,
    canvas,
    heroStart,
    heroEnd,
  } = resolveThemeInputs(config)
  const heroMid = mixColors(heroStart, heroEnd, 0.5)
  const heroText = config.hero_text_color_override
    ? normalizeHex(config.hero_text_color_override)
    : readableText(heroMid)
  const ctaText = readableText(primary)
  const pageBase = mixColors('#ffffff', canvas, 0.78)
  const surfaceBase = mixColors('#ffffff', canvas, 0.42)
  const surfaceAlt = mixColors('#faf8f4', canvas, 0.56)
  const surfaceSoft = withAlpha(mixColors('#ffffff', canvas, 0.26), 0.84)
  const accentStrong = primary
  const accentDeep = darken(primary, 0.16)
  const textPrimary = mixColors('#1a2a3d', canvas, 0.08)
  const textBody = mixColors('#40556c', canvas, 0.08)
  const textMuted = mixColors('#6f8299', canvas, 0.1)
  const textSecondary = mixColors('#89a0b9', canvas, 0.1)
  const ctaHover = darken(primary, 0.12)
  const ctaActive = darken(primary, 0.2)
  const chipText = mixColors('#51637d', primary, 0.1)
  const secondaryButtonText = mixColors('#233553', primary, 0.1)
  const fieldFocus = withAlpha(primary, 0.28)
  const secondaryButtonBg = withAlpha(mixColors('#ffffff', secondary, 0.14), 0.96)
  const secondaryButtonHover = withAlpha(mixColors('#ffffff', secondary, 0.22), 0.98)
  const panelCardBgStart = withAlpha(mixColors('#ffffff', canvas, 0.16), 0.98)
  const panelCardBgEnd = withAlpha(mixColors('#ffffff', canvas, 0.34), 0.94)
  const panelCalloutStart = withAlpha(mixColors('#ffffff', canvas, 0.26), 0.98)
  const panelCalloutEnd = withAlpha(mixColors('#ffffff', secondary, 0.18), 0.95)
  const fieldBg = withAlpha(mixColors('#ffffff', canvas, 0.12), 0.98)
  const progressTrack = mixColors('#e7edf5', canvas, 0.68)
  const statusBg = withAlpha(mixColors('#ffffff', primary, 0.1), 0.9)
  const softHeroStart = withAlpha(heroStart, isAchromatic(heroStart) ? 0.08 : 0.18)
  const softHeroEnd = withAlpha(heroEnd, isAchromatic(heroEnd) ? 0.08 : 0.18)
  const softSecondary = withAlpha(secondary, isAchromatic(secondary) ? 0.06 : 0.16)

  const lines = [
    `--site-brand-hero-start: ${heroStartSeed};`,
    `--site-brand-hero-end: ${heroEndSeed};`,
    `--site-brand-canvas: ${canvasSeed};`,
    `--site-brand-primary-cta: ${primarySeed};`,
    `--site-brand-secondary-cta: ${secondarySeed};`,
    `--site-bg: ${pageBase};`,
    `--site-surface: ${surfaceBase};`,
    `--site-surface-alt: ${surfaceAlt};`,
    `--site-surface-elevated: ${withAlpha(lighten(surfaceBase, 0.08), 0.9)};`,
    `--site-surface-soft: ${surfaceSoft};`,
    `--site-text-primary: ${textPrimary};`,
    `--site-text-body: ${textBody};`,
    `--site-text-muted: ${textMuted};`,
    `--site-text-secondary: ${textSecondary};`,
    `--site-on-dark-primary: ${ctaText};`,
    `--site-on-dark-muted: ${withAlpha(ctaText, 0.82)};`,
    `--site-accent: ${accentStrong};`,
    `--site-accent-strong: ${accentStrong};`,
    `--site-accent-deep: ${accentDeep};`,
    `--site-accent-pop: ${secondary};`,
    `--site-border: ${withAlpha(accentStrong, 0.14)};`,
    `--site-border-soft: ${withAlpha(accentStrong, 0.08)};`,
    `--site-cta-bg: ${primary};`,
    `--site-cta-text: ${ctaText};`,
    `--site-cta-hover-bg: ${ctaHover};`,
    `--site-cta-active-bg: ${ctaActive};`,
    `--site-cta-ring: ${withAlpha(primary, 0.24)};`,
    `--site-cta-soft: ${withAlpha(primary, 0.2)};`,
    `--site-link: ${primary};`,
    `--site-link-hover: ${accentDeep};`,
    `--site-primary: ${primary};`,
    `--site-primary-hover: ${ctaHover};`,
    `--site-grid-line: ${withAlpha(accentStrong, 0.08)};`,
    `--site-blueprint-tint: ${withAlpha(heroStart, 0.12)};`,
    `--site-accent-glass-tint: ${withAlpha(secondary, 0.12)};`,
    `--site-ambient-page-gradient: radial-gradient(circle at 12% 10%, ${softHeroStart}, transparent 34%), radial-gradient(circle at 86% 22%, ${softHeroEnd}, transparent 40%), radial-gradient(circle at 70% 84%, ${softSecondary}, transparent 42%), linear-gradient(146deg, ${pageBase} 0%, ${mixColors(pageBase, canvas, 0.22)} 54%, ${mixColors('#fbfaf7', canvas, 0.12)} 100%);`,
    `--site-gradient-soft: linear-gradient(132deg, ${withAlpha(mixColors('#ffffff', canvas, 0.14), 0.98)} 0%, ${withAlpha(mixColors('#ffffff', heroStart, 0.06), 0.94)} 55%, ${withAlpha(mixColors('#ffffff', heroEnd, 0.08), 0.96)} 100%);`,
    `--site-gradient-stage: radial-gradient(circle at 16% 12%, ${withAlpha(heroStart, 0.16)}, transparent 42%), radial-gradient(circle at 84% 82%, ${withAlpha(heroEnd, 0.16)}, transparent 46%), linear-gradient(138deg, ${withAlpha(mixColors('#ffffff', canvas, 0.18), 0.88)} 0%, ${withAlpha(mixColors('#ffffff', canvas, 0.28), 0.74)} 56%, ${withAlpha(mixColors('#ffffff', heroEnd, 0.08), 0.8)} 100%);`,
    `--site-overlay-strong: ${withAlpha(darken(heroMid, 0.72), 0.36)};`,
    `--site-overlay-text: ${heroText};`,
    `--site-glass-bg: linear-gradient(148deg, ${withAlpha(mixColors('#ffffff', canvas, 0.12), 0.7)} 0%, ${withAlpha(mixColors('#ffffff', heroEnd, 0.08), 0.42)} 100%);`,
    `--site-glass-bg-strong: linear-gradient(148deg, ${withAlpha(mixColors('#ffffff', canvas, 0.1), 0.82)} 0%, ${withAlpha(mixColors('#ffffff', heroEnd, 0.08), 0.54)} 100%);`,
    `--site-glass-border: ${withAlpha(lighten(canvas, 0.18), 0.48)};`,
    `--site-glass-specular: ${withAlpha('#ffffff', 0.32)};`,
    `--site-header-bg: linear-gradient(135deg, ${withAlpha(mixColors('#ffffff', canvas, 0.18), 0.92)}, ${withAlpha(mixColors('#ffffff', heroEnd, 0.08), 0.84)});`,
    `--site-header-border: ${withAlpha(accentStrong, 0.12)};`,
    `--site-header-text: ${textPrimary};`,
    `--site-panel-hero-bg: linear-gradient(135deg, ${heroStart} 0%, ${heroEnd} 100%);`,
    `--site-panel-hero-border: ${withAlpha(accentStrong, 0.22)};`,
    `--site-panel-hero-text: ${heroText};`,
    `--site-panel-hero-muted: ${withAlpha(heroText, 0.82)};`,
    `--site-panel-transition-bg: linear-gradient(180deg, ${withAlpha(mixColors('#ffffff', canvas, 0.16), 0.98)}, ${withAlpha(mixColors('#ffffff', heroEnd, 0.1), 0.94)});`,
    `--site-panel-callout-bg: linear-gradient(160deg, ${panelCalloutStart} 0%, ${panelCalloutEnd} 100%);`,
    `--site-panel-callout-border: ${withAlpha(accentStrong, 0.22)};`,
    `--site-panel-card-bg: linear-gradient(160deg, ${panelCardBgStart} 0%, ${panelCardBgEnd} 100%);`,
    `--site-panel-card-border: ${withAlpha(accentStrong, 0.16)};`,
    `--site-form-bg: ${fieldBg};`,
    `--site-chip-bg: ${withAlpha(mixColors('#ffffff', canvas, 0.16), 0.88)};`,
    `--site-chip-border: ${withAlpha(accentStrong, 0.16)};`,
    `--site-chip-text: ${chipText};`,
    `--site-button-secondary-bg: ${secondaryButtonBg};`,
    `--site-button-secondary-border: ${withAlpha(accentStrong, 0.16)};`,
    `--site-button-secondary-text: ${secondaryButtonText};`,
    `--site-button-secondary-hover: ${secondaryButtonHover};`,
    `--site-option-bg: ${withAlpha(mixColors('#ffffff', canvas, 0.08), 0.98)};`,
    `--site-option-border: ${withAlpha(accentStrong, 0.12)};`,
    `--site-option-hover-border: ${withAlpha(primary, 0.34)};`,
    `--site-option-selected-bg: ${withAlpha(mixColors('#ffffff', secondary, 0.12), 0.96)};`,
    `--site-option-selected-border: ${withAlpha(primary, 0.28)};`,
    `--site-option-badge-bg: ${withAlpha(mixColors('#ffffff', secondary, 0.18), 0.96)};`,
    `--site-option-badge-text: ${textPrimary};`,
    `--site-progress-track: ${progressTrack};`,
    `--site-progress-fill: linear-gradient(90deg, ${primary}, ${secondary});`,
    `--site-status-bg: ${statusBg};`,
    `--site-status-border: ${withAlpha(accentStrong, 0.12)};`,
    `--site-status-text: ${mixColors('#415a79', primary, 0.1)};`,
    `--site-status-pulse: ${withAlpha(primary, 0.74)};`,
    `--site-field-bg: ${fieldBg};`,
    `--site-field-border: ${withAlpha(accentStrong, 0.14)};`,
    `--site-field-focus: ${fieldFocus};`,
    `--site-error: ${mixColors('#9f3a2f', primary, 0.15)};`,
    `--site-required: ${mixColors('#9f3a2f', primary, 0.15)};`,
    `--site-warning-border: ${mixColors('#fcd34d', secondary, 0.12)};`,
    `--site-warning-bg: ${mixColors('#fffbeb', canvas, 0.08)};`,
  ]

  return lines.join('\n')
}

type EffectiveSeedEntry = {
  input: string
  effective: string
  adjusted: boolean
}

export const LQ_BRAND_CONFIG: OrgBrandingConfig = {
  theme_version: 1,
  branding_enabled: true,
  logo_url: null,
  favicon_url: null,
  hero_gradient_start_color: LQ_PRESETS.dark.heroGradientStart,
  hero_gradient_end_color: LQ_PRESETS.dark.heroGradientEnd,
  canvas_tint_color: LQ_PRESETS.dark.canvasTint,
  primary_cta_color: LQ_PRESETS.dark.primaryCta,
  secondary_cta_accent_color: LQ_PRESETS.dark.secondaryAccent,
  hero_text_color_override: null,
  company_name: 'Leadership Quarter',
  show_lq_attribution: false,
  primary_color: null,
  secondary_color: null,
  surface_tint_color: null,
  hero_surface_color: null,
}

export function buildLqBrandCssOverrides(): string {
  return buildBrandCssOverrides(LQ_BRAND_CONFIG)
}

export function getEffectiveSeedColors(config: OrgBrandingConfig): {
  heroStart: EffectiveSeedEntry
  heroEnd: EffectiveSeedEntry
  canvas: EffectiveSeedEntry
  primary: EffectiveSeedEntry
  secondary: EffectiveSeedEntry
} {
  const inputs = resolveThemeInputs(config)

  function entry(seed: string, effective: string): EffectiveSeedEntry {
    return {
      input: seed,
      effective,
      adjusted: seed.toLowerCase() !== effective.toLowerCase(),
    }
  }

  return {
    heroStart: entry(inputs.heroStartSeed, inputs.heroStart),
    heroEnd: entry(inputs.heroEndSeed, inputs.heroEnd),
    canvas: entry(inputs.canvasSeed, inputs.canvas),
    primary: entry(inputs.primarySeed, inputs.primary),
    secondary: entry(inputs.secondarySeed, inputs.secondary),
  }
}
