function normalizeBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.replace(/\/$/, '')
}

export function getPublicSiteUrl() {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3001'
}

export function getPublicCampaignUrl(slug: string) {
  return `${getPublicSiteUrl()}/assess/c/${encodeURIComponent(slug)}`
}
