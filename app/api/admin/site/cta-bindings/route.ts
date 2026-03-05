import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  isSiteCtaSlot,
  SITE_CTA_SLOTS,
  type SiteCtaBinding,
  type SiteCtaSlot,
} from '@/utils/site/cta-bindings'

type DashboardAuth = Awaited<ReturnType<typeof requireDashboardApiAuth>>
type AdminClient = Extract<DashboardAuth, { ok: true }>['adminClient']

async function loadBindings(adminClient: AdminClient) {
  const { data, error } = await adminClient
    .from('site_cta_bindings')
    .select('slot, campaign_slug, updated_at')

  if (error) {
    return { ok: false as const, error }
  }

  const rows = (data ?? []) as Array<{ slot: SiteCtaSlot; campaign_slug: string | null; updated_at: string }>
  const bySlot = new Map(rows.map((row) => [row.slot, row] as const))

  const bindings = SITE_CTA_SLOTS.map((slot) => ({
    slot,
    campaign_slug: bySlot.get(slot)?.campaign_slug ?? null,
    updated_at: bySlot.get(slot)?.updated_at,
  }))

  return { ok: true as const, bindings }
}

export async function GET() {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const result = await loadBindings(auth.adminClient)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'bindings_load_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, bindings: result.bindings })
}

export async function PUT(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as { bindings?: SiteCtaBinding[] } | null
  if (!Array.isArray(body?.bindings)) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const rawBindings = body.bindings
  const slotSet = new Set<string>()
  for (const row of rawBindings) {
    if (!row || typeof row.slot !== 'string' || !isSiteCtaSlot(row.slot)) {
      return NextResponse.json({ ok: false, error: 'invalid_slot' }, { status: 400 })
    }
    if (slotSet.has(row.slot)) {
      return NextResponse.json({ ok: false, error: 'duplicate_slot' }, { status: 400 })
    }
    slotSet.add(row.slot)
  }

  const completeBindings = SITE_CTA_SLOTS.map((slot) => {
    const found = rawBindings.find((row) => row.slot === slot)
    return {
      slot,
      campaign_slug: found?.campaign_slug ? String(found.campaign_slug).trim() : null,
    }
  })

  const slugs = completeBindings.map((row) => row.campaign_slug).filter((slug): slug is string => Boolean(slug))
  if (slugs.length > 0) {
    const { data: activeCampaigns, error: campaignError } = await auth.adminClient
      .from('campaigns')
      .select('slug, status')
      .in('slug', slugs)

    if (campaignError) {
      return NextResponse.json({ ok: false, error: 'campaign_lookup_failed' }, { status: 500 })
    }

    const activeSlugSet = new Set(
      (activeCampaigns ?? [])
        .filter((row: { status: string }) => row.status === 'active')
        .map((row: { slug: string }) => row.slug)
    )

    for (const slug of slugs) {
      if (!activeSlugSet.has(slug)) {
        return NextResponse.json({ ok: false, error: 'campaign_not_active', slug }, { status: 400 })
      }
    }
  }

  const upserts = completeBindings.map((row) => ({
    slot: row.slot,
    campaign_slug: row.campaign_slug,
    updated_by: auth.user.id,
    updated_at: new Date().toISOString(),
  }))

  const { error: upsertError } = await auth.adminClient
    .from('site_cta_bindings')
    .upsert(upserts, { onConflict: 'slot' })

  if (upsertError) {
    return NextResponse.json({ ok: false, error: 'bindings_save_failed' }, { status: 500 })
  }

  const result = await loadBindings(auth.adminClient)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'bindings_load_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, bindings: result.bindings })
}
