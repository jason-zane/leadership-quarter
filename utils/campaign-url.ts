export const LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG = 'leadership-quarter'

function encodeSegment(value: string) {
  return encodeURIComponent(value)
}

export function resolveCampaignOrganisationSlug(organisationSlug?: string | null) {
  const trimmed = organisationSlug?.trim()
  return trimmed || LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG
}

export function getPublicCampaignPath(campaignSlug: string, organisationSlug?: string | null) {
  return `/assess/c/${encodeSegment(resolveCampaignOrganisationSlug(organisationSlug))}/${encodeSegment(campaignSlug)}`
}

export function getPublicCampaignApiPath(campaignSlug: string, organisationSlug?: string | null) {
  return `/api/assessments/campaigns/${encodeSegment(resolveCampaignOrganisationSlug(organisationSlug))}/${encodeSegment(campaignSlug)}`
}

export function getPublicCampaignRuntimeApiPath(campaignSlug: string, organisationSlug?: string | null) {
  return `/api/assessments/runtime/campaign/${encodeSegment(resolveCampaignOrganisationSlug(organisationSlug))}/${encodeSegment(campaignSlug)}`
}
