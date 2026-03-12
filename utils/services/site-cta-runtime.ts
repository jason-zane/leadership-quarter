import { createAdminClient } from '@/utils/supabase/admin'
import { getSiteCtaFallbackHref, type SiteCtaSlot } from '@/utils/site/cta-bindings'

export async function resolveSiteCtaHref(
  slot: SiteCtaSlot
): Promise<{ href: string; source: 'campaign' | 'fallback'; campaignSlug?: string }> {
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
    .maybeSingle()

  if (campaignError || !campaign || campaign.status !== 'active') {
    return { href: fallbackHref, source: 'fallback' }
  }

  return {
    href: `/assess/c/${encodeURIComponent(campaign.slug)}`,
    source: 'campaign',
    campaignSlug: campaign.slug,
  }
}
