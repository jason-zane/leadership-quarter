import { getPublicBaseUrl } from '@/utils/hosts'
import { getPublicCampaignPath } from '@/utils/campaign-url'

function normalizeBaseUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null
  return trimmed.replace(/\/$/, '')
}

export function getPublicSiteUrl() {
  return normalizeBaseUrl(getPublicBaseUrl()) ?? 'http://localhost:3001'
}

export function getPublicCampaignUrl(campaignSlug: string, organisationSlug?: string | null) {
  return `${getPublicSiteUrl()}${getPublicCampaignPath(campaignSlug, organisationSlug)}`
}
