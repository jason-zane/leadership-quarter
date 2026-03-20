import { createAdminClient } from '@/utils/supabase/admin'
import {
  LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG,
  getPublicCampaignPath,
} from '@/utils/campaign-url'
import { getSiteCtaFallbackHref, type SiteCtaSlot } from '@/utils/site/cta-bindings'

export async function resolveSiteCtaHref(
  slot: SiteCtaSlot
): Promise<{ href: string | null; source: 'campaign' | 'fallback'; campaignSlug?: string }> {
  const adminClient = createAdminClient()
  const fallbackHref = getSiteCtaFallbackHref(slot)

  if (!adminClient) {
    return { href: fallbackHref, source: 'fallback' }
  }

  const { data: binding, error: bindingError } = await adminClient
    .from('site_cta_bindings')
    .select('campaign_slug')
    .eq('slot', slot)
    .maybeSingle()

  if (bindingError) {
    return { href: fallbackHref, source: 'fallback' }
  }

  const campaignSlug = (binding?.campaign_slug ? String(binding.campaign_slug).trim() : null) || null
  if (!campaignSlug) {
    return { href: fallbackHref, source: 'fallback' }
  }

  const { data: campaign, error: campaignError } = await adminClient
    .from('campaigns')
    .select('slug, status')
    .eq('slug', campaignSlug)
    .is('organisation_id', null)
    .maybeSingle()

  if (campaignError || !campaign || campaign.status !== 'active') {
    return { href: fallbackHref, source: 'fallback' }
  }

  return {
    href: getPublicCampaignPath(campaign.slug, LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG),
    source: 'campaign',
    campaignSlug: campaign.slug,
  }
}
