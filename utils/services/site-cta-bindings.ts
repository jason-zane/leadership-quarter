import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  isSiteCtaSlot,
  SITE_CTA_SLOTS,
  type SiteCtaSlot,
} from '@/utils/site/cta-bindings'

type AdminClient = RouteAuthSuccess['adminClient']

async function loadBindings(
  adminClient: AdminClient
): Promise<
  | { ok: true; data: { bindings: Array<{ slot: SiteCtaSlot; campaign_slug: string | null; updated_at?: string }> } }
  | { ok: false; error: 'bindings_load_failed' }
> {
  const { data, error } = await adminClient.from('site_cta_bindings').select('slot, campaign_slug, updated_at')

  if (error) {
    return { ok: false as const, error: 'bindings_load_failed' }
  }

  const rows = (data ?? []) as Array<{ slot: SiteCtaSlot; campaign_slug: string | null; updated_at: string }>
  const bySlot = new Map(rows.map((row) => [row.slot, row] as const))

  return {
    ok: true as const,
    data: {
      bindings: SITE_CTA_SLOTS.map((slot) => ({
        slot,
        campaign_slug: bySlot.get(slot)?.campaign_slug ?? null,
        updated_at: bySlot.get(slot)?.updated_at,
      })),
    },
  }
}

export async function listSiteCtaBindings(input: {
  adminClient: AdminClient
}): Promise<
  | { ok: true; data: { bindings: Array<{ slot: SiteCtaSlot; campaign_slug: string | null; updated_at?: string }> } }
  | { ok: false; error: 'bindings_load_failed' }
> {
  return loadBindings(input.adminClient)
}

export async function saveSiteCtaBindings(input: {
  adminClient: AdminClient
  actorUserId: string
  payload:
    | {
        bindings?: Array<{
          slot: string
          campaign_slug: string | null
          updated_at?: string
        }>
      }
    | null
}): Promise<
  | { ok: true; data: { bindings: Array<{ slot: SiteCtaSlot; campaign_slug: string | null; updated_at?: string }> } }
  | {
      ok: false
      error:
        | 'invalid_payload'
        | 'invalid_slot'
        | 'duplicate_slot'
        | 'campaign_lookup_failed'
        | 'campaign_not_active'
        | 'bindings_save_failed'
        | 'bindings_load_failed'
      slug?: string
    }
> {
  if (!Array.isArray(input.payload?.bindings)) {
    return { ok: false, error: 'invalid_payload' }
  }

  const slotSet = new Set<string>()
  for (const row of input.payload.bindings) {
    if (!row || typeof row.slot !== 'string' || !isSiteCtaSlot(row.slot)) {
      return { ok: false, error: 'invalid_slot' }
    }

    if (slotSet.has(row.slot)) {
      return { ok: false, error: 'duplicate_slot' }
    }

    slotSet.add(row.slot)
  }

  const completeBindings = SITE_CTA_SLOTS.map((slot) => {
    const found = input.payload?.bindings?.find((row) => row.slot === slot)
    return {
      slot,
      campaign_slug: found?.campaign_slug ? String(found.campaign_slug).trim() : null,
    }
  })

  const slugs = completeBindings
    .map((row) => row.campaign_slug)
    .filter((slug): slug is string => Boolean(slug))

  if (slugs.length > 0) {
    const { data, error } = await input.adminClient
      .from('campaigns')
      .select('slug, status')
      .is('organisation_id', null)
      .in('slug', slugs)
    if (error) {
      return { ok: false, error: 'campaign_lookup_failed' }
    }

    const activeSlugSet = new Set(
      (data ?? [])
        .filter((row: { status: string }) => row.status === 'active')
        .map((row: { slug: string }) => row.slug)
    )

    for (const slug of slugs) {
      if (!activeSlugSet.has(slug)) {
        return { ok: false, error: 'campaign_not_active', slug }
      }
    }
  }

  const nowIso = new Date().toISOString()
  const upserts = completeBindings.map((row) => ({
    slot: row.slot,
    campaign_slug: row.campaign_slug,
    updated_by: input.actorUserId,
    updated_at: nowIso,
  }))

  const { error } = await input.adminClient.from('site_cta_bindings').upsert(upserts, { onConflict: 'slot' })
  if (error) {
    return { ok: false, error: 'bindings_save_failed' }
  }

  return loadBindings(input.adminClient)
}
