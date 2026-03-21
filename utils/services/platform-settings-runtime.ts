import type { SupabaseClient } from '@supabase/supabase-js'
import {
  loadPlatformSettings,
  getPlatformSettingSync,
} from '@/utils/services/platform-settings'

/**
 * Pre-warm the settings cache from the DB. Call this once early in any
 * request that needs settings values (e.g. after auth succeeds).
 *
 * Subsequent calls within the 60-second cache TTL are free (returns cached).
 */
export async function warmPlatformSettings(adminClient: SupabaseClient): Promise<void> {
  await loadPlatformSettings(adminClient)
}

/**
 * Shorthand for reading a rate limit setting (always a number).
 * Falls back to the compile-time default if the cache isn't warm yet.
 */
export function rateLimitFor(key: string): number {
  return getPlatformSettingSync<number>('rate_limits', key)
}

/**
 * Shorthand for reading an email setting.
 */
export function emailSettingFor(key: string): number {
  return getPlatformSettingSync<number>('email', key)
}

/**
 * Shorthand for reading a token/session TTL setting.
 */
export function tokenTtlFor(key: string): number {
  return getPlatformSettingSync<number>('tokens', key)
}

/**
 * Report access token TTL in seconds, read from platform settings.
 * Default: 7 days.
 */
export function reportAccessTtlSeconds(): number {
  return tokenTtlFor('report_access_ttl_days') * 24 * 60 * 60
}

/**
 * Gate token TTL in seconds, read from platform settings.
 * Default: 2 hours.
 */
export function gateTokenTtlSeconds(): number {
  return tokenTtlFor('gate_token_ttl_hours') * 60 * 60
}

/**
 * Invitation expiry in milliseconds from now.
 * Default: 30 days.
 */
export function invitationExpiryMs(): number {
  return tokenTtlFor('invitation_expiry_days') * 24 * 60 * 60 * 1000
}

/**
 * Portal bypass cookie TTL in seconds.
 * Default: 1 hour.
 */
export function portalBypassTtlSeconds(): number {
  return tokenTtlFor('portal_bypass_ttl_hours') * 60 * 60
}
