import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getSiteCtaFallbackHref, isSiteCtaSlot } from '@/utils/site/cta-bindings'

export async function GET(_request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const adminClient = createAdminClient()
  const { slot: rawSlot } = await params

  if (!isSiteCtaSlot(rawSlot)) {
    return NextResponse.json({ ok: false, error: 'invalid_slot' }, { status: 400 })
  }

  const fallbackHref = getSiteCtaFallbackHref(rawSlot)
  if (!adminClient) {
    return NextResponse.json({ ok: true, slot: rawSlot, href: fallbackHref, source: 'fallback' as const })
  }

  const { data: binding } = await adminClient
    .from('site_cta_bindings')
    .select('campaign_slug')
    .eq('slot', rawSlot)
    .maybeSingle()

  const campaignSlug = (binding?.campaign_slug ? String(binding.campaign_slug).trim() : null) || null
  if (!campaignSlug) {
    return NextResponse.json({ ok: true, slot: rawSlot, href: fallbackHref, source: 'fallback' as const })
  }

  const { data: campaign } = await adminClient
    .from('campaigns')
    .select('slug, status')
    .eq('slug', campaignSlug)
    .maybeSingle()

  if (!campaign || campaign.status !== 'active') {
    return NextResponse.json({ ok: true, slot: rawSlot, href: fallbackHref, source: 'fallback' as const })
  }

  return NextResponse.json({
    ok: true,
    slot: rawSlot,
    href: `/assess/c/${encodeURIComponent(campaign.slug)}`,
    campaignSlug: campaign.slug,
    source: 'campaign' as const,
  })
}

