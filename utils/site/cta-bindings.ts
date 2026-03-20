export const SITE_CTA_SLOTS = [
  'ai_readiness_orientation_primary',
  'ai_readiness_orientation_secondary',
] as const

export type SiteCtaSlot = (typeof SITE_CTA_SLOTS)[number]

export type SiteCtaBinding = {
  slot: SiteCtaSlot
  campaign_slug: string | null
  updated_at?: string
}

export function isSiteCtaSlot(value: string): value is SiteCtaSlot {
  return SITE_CTA_SLOTS.includes(value as SiteCtaSlot)
}

export function getSiteCtaFallbackHref(_slot: SiteCtaSlot): null {
  return null
}

