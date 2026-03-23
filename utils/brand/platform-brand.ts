import type { SupabaseClient } from '@supabase/supabase-js'
import {
  LQ_BRAND_CONFIG,
  normalizeOrgBrandingConfig,
  type OrgBrandingConfig,
} from '@/utils/brand/org-brand-utils'

let cachedBrand: OrgBrandingConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000

export function invalidatePlatformBrandCache() {
  cachedBrand = null
  cacheTimestamp = 0
}

export async function getPlatformBrandConfig(
  adminClient: SupabaseClient
): Promise<OrgBrandingConfig> {
  const now = Date.now()
  if (cachedBrand && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedBrand
  }

  try {
    const { data, error } = await adminClient
      .from('platform_settings')
      .select('value')
      .eq('category', 'brand')
      .eq('key', 'platform_brand')
      .maybeSingle()

    if (error || !data) {
      cachedBrand = LQ_BRAND_CONFIG
      cacheTimestamp = now
      return LQ_BRAND_CONFIG
    }

    const rawValue = (data.value as { v?: unknown })?.v
    const config = normalizeOrgBrandingConfig(rawValue)

    // Platform brand is always enabled
    const result: OrgBrandingConfig = { ...config, branding_enabled: true }
    cachedBrand = result
    cacheTimestamp = now
    return result
  } catch {
    cachedBrand = LQ_BRAND_CONFIG
    cacheTimestamp = now
    return LQ_BRAND_CONFIG
  }
}

export async function savePlatformBrandConfig(
  adminClient: SupabaseClient,
  config: OrgBrandingConfig,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString()
  const { error } = await adminClient.from('platform_settings').upsert(
    {
      category: 'brand',
      key: 'platform_brand',
      value: { v: config },
      label: 'Platform Brand',
      description: 'LQ default brand seeds',
      updated_by: userId,
      updated_at: now,
    },
    { onConflict: 'category,key' }
  )

  if (error) {
    return { ok: false, error: error.message }
  }

  invalidatePlatformBrandCache()
  return { ok: true }
}

export async function resetPlatformBrandConfig(
  adminClient: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await adminClient
    .from('platform_settings')
    .delete()
    .eq('category', 'brand')
    .eq('key', 'platform_brand')

  if (error) {
    return { ok: false, error: error.message }
  }

  invalidatePlatformBrandCache()
  return { ok: true }
}
