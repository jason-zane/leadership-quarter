import { NextResponse } from 'next/server'
import { isSiteCtaSlot } from '@/utils/site/cta-bindings'
import { resolveSiteCtaHref } from '@/utils/services/site-cta-runtime'

export async function GET(_request: Request, { params }: { params: Promise<{ slot: string }> }) {
  const { slot: rawSlot } = await params

  if (!isSiteCtaSlot(rawSlot)) {
    return NextResponse.json({ ok: false, error: 'invalid_slot' }, { status: 400 })
  }

  const resolved = await resolveSiteCtaHref(rawSlot)

  return NextResponse.json({
    ok: true,
    slot: rawSlot,
    href: resolved.href,
    campaignSlug: resolved.campaignSlug,
    source: resolved.source,
  })
}
