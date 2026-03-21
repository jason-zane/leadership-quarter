import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Default values — used when no DB override exists.
// Organised by category to match the admin settings UI.
// ---------------------------------------------------------------------------

export const SETTING_CATEGORIES = [
  'rate_limits',
  'email',
  'tokens',
  'campaigns',
] as const

export type SettingCategory = (typeof SETTING_CATEGORIES)[number]

export type SettingDefinition = {
  category: SettingCategory
  key: string
  label: string
  description: string
  defaultValue: number | string | boolean
  type: 'number' | 'string' | 'boolean'
  min?: number
  max?: number
  unit?: string
  warning?: string
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  // ── Rate Limits: Public ──────────────────────────────────────────────
  {
    category: 'rate_limits',
    key: 'public_page_rpm',
    label: 'Public page requests',
    description: 'Max requests per minute from a single IP to public pages.',
    defaultValue: 120,
    type: 'number',
    min: 10,
    max: 1000,
    unit: 'per minute',
  },
  {
    category: 'rate_limits',
    key: 'public_read_api_rpm',
    label: 'Public read API requests',
    description: 'Max GET requests per minute from a single IP to public API endpoints (campaign pages, assessment loading).',
    defaultValue: 60,
    type: 'number',
    min: 10,
    max: 500,
    unit: 'per minute',
  },
  {
    category: 'rate_limits',
    key: 'public_write_api_rpm',
    label: 'Public write API requests',
    description: 'Max POST requests per minute from a single IP to public API endpoints (form submissions, assessment submissions).',
    defaultValue: 30,
    type: 'number',
    min: 5,
    max: 200,
    unit: 'per minute',
  },

  // ── Rate Limits: Admin ───────────────────────────────────────────────
  {
    category: 'rate_limits',
    key: 'admin_api_rpm',
    label: 'Admin API (general)',
    description: 'Blanket rate limit for all admin API requests per minute per user. Protects against compromised credentials or runaway scripts.',
    defaultValue: 120,
    type: 'number',
    min: 20,
    max: 600,
    unit: 'per minute',
  },
  {
    category: 'rate_limits',
    key: 'admin_invitation_send_rpm',
    label: 'Admin invitation sends',
    description: 'Max invitation email sends per minute per admin user.',
    defaultValue: 10,
    type: 'number',
    min: 1,
    max: 60,
    unit: 'per minute',
  },
  {
    category: 'rate_limits',
    key: 'admin_invitation_create_rpm',
    label: 'Admin invitation creation',
    description: 'Max invitation creation requests per minute per admin user.',
    defaultValue: 6,
    type: 'number',
    min: 1,
    max: 30,
    unit: 'per minute',
  },
  {
    category: 'rate_limits',
    key: 'assessment_submit_rpm',
    label: 'Assessment submission',
    description: 'Max assessment submissions per minute from a single IP. Increase for high-volume campaign events.',
    defaultValue: 20,
    type: 'number',
    min: 5,
    max: 100,
    unit: 'per minute',
  },
  {
    category: 'rate_limits',
    key: 'pdf_generation_rpm',
    label: 'PDF generation',
    description: 'Max PDF report generation requests per minute from a single IP.',
    defaultValue: 10,
    type: 'number',
    min: 2,
    max: 30,
    unit: 'per minute',
  },

  // ── Rate Limits: Portal ──────────────────────────────────────────────
  {
    category: 'rate_limits',
    key: 'portal_invitation_send_rpm',
    label: 'Portal invitation sends',
    description: 'Max invitation sends per minute per portal user.',
    defaultValue: 6,
    type: 'number',
    min: 1,
    max: 30,
    unit: 'per minute',
  },
  {
    category: 'rate_limits',
    key: 'portal_export_rpm',
    label: 'Portal CSV exports',
    description: 'Max export requests per minute per portal user.',
    defaultValue: 12,
    type: 'number',
    min: 2,
    max: 30,
    unit: 'per minute',
  },

  // ── Email ────────────────────────────────────────────────────────────
  {
    category: 'email',
    key: 'per_address_max',
    label: 'Per-address email limit',
    description: 'Max emails to a single address within the rate window. Prevents accidental spam to one recipient.',
    defaultValue: 3,
    type: 'number',
    min: 1,
    max: 20,
    unit: 'emails',
  },
  {
    category: 'email',
    key: 'per_address_window_minutes',
    label: 'Per-address rate window',
    description: 'Time window for the per-address email limit.',
    defaultValue: 10,
    type: 'number',
    min: 1,
    max: 60,
    unit: 'minutes',
  },
  {
    category: 'email',
    key: 'per_campaign_max',
    label: 'Per-campaign email limit',
    description: 'Max total emails sent for a single campaign within the rate window. Increase for large-scale campaign launches.',
    defaultValue: 100,
    type: 'number',
    min: 10,
    max: 5000,
    unit: 'emails',
    warning: 'Values above 100 may exceed your Resend daily limit on the free tier (100 emails/day).',
  },
  {
    category: 'email',
    key: 'per_campaign_window_minutes',
    label: 'Per-campaign rate window',
    description: 'Time window for the per-campaign email limit.',
    defaultValue: 60,
    type: 'number',
    min: 10,
    max: 1440,
    unit: 'minutes',
  },
  {
    category: 'email',
    key: 'email_batch_size',
    label: 'Cron email batch size',
    description: 'Number of queued emails processed per cron run.',
    defaultValue: 20,
    type: 'number',
    min: 1,
    max: 100,
    unit: 'emails',
  },

  // ── Token & Session Lifetimes ────────────────────────────────────────
  {
    category: 'tokens',
    key: 'report_access_ttl_days',
    label: 'Report access link lifetime',
    description: 'How long a participant report link stays valid after generation.',
    defaultValue: 7,
    type: 'number',
    min: 1,
    max: 90,
    unit: 'days',
  },
  {
    category: 'tokens',
    key: 'gate_token_ttl_hours',
    label: 'Contact gate token lifetime',
    description: 'How long a contact-gate token stays valid after assessment completion.',
    defaultValue: 2,
    type: 'number',
    min: 1,
    max: 48,
    unit: 'hours',
  },
  {
    category: 'tokens',
    key: 'invitation_expiry_days',
    label: 'Invitation expiry',
    description: 'How many days a campaign invitation link stays valid.',
    defaultValue: 30,
    type: 'number',
    min: 1,
    max: 365,
    unit: 'days',
  },
  {
    category: 'tokens',
    key: 'portal_bypass_ttl_hours',
    label: 'Portal bypass session duration',
    description: 'How long an admin portal bypass session lasts before requiring re-authentication.',
    defaultValue: 1,
    type: 'number',
    min: 1,
    max: 24,
    unit: 'hours',
  },

  // ── Campaign Defaults ────────────────────────────────────────────────
  {
    category: 'campaigns',
    key: 'default_page_size',
    label: 'Default page size',
    description: 'Default number of items per page in participant/response lists.',
    defaultValue: 25,
    type: 'number',
    min: 10,
    max: 100,
    unit: 'items',
  },
  {
    category: 'campaigns',
    key: 'max_page_size',
    label: 'Maximum page size',
    description: 'Maximum number of items a user can request per page.',
    defaultValue: 100,
    type: 'number',
    min: 25,
    max: 500,
    unit: 'items',
  },
]

// ---------------------------------------------------------------------------
// Runtime settings reader
// ---------------------------------------------------------------------------

type SettingsMap = Map<string, number | string | boolean>

let cachedSettings: SettingsMap | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60_000

function compositeKey(category: string, key: string) {
  return `${category}:${key}`
}

function buildDefaultsMap(): SettingsMap {
  const map = new Map<string, number | string | boolean>()
  for (const def of SETTING_DEFINITIONS) {
    map.set(compositeKey(def.category, def.key), def.defaultValue)
  }
  return map
}

export async function loadPlatformSettings(
  adminClient: SupabaseClient
): Promise<SettingsMap> {
  const now = Date.now()
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSettings
  }

  const defaults = buildDefaultsMap()
  let data: Array<{ category: string; key: string; value: unknown }> | null = null
  let error: unknown = null

  try {
    const result = await adminClient
      .from('platform_settings')
      .select('category, key, value')
    data = (result.data ?? null) as Array<{ category: string; key: string; value: unknown }> | null
    error = result.error ?? null
  } catch {
    error = new Error('platform_settings_unavailable')
  }

  if (error || !data) {
    cachedSettings = defaults
    cacheTimestamp = now
    return defaults
  }

  for (const row of data) {
    const ck = compositeKey(row.category, row.key)
    const rawValue = (row.value as { v?: unknown })?.v
    if (rawValue !== undefined && defaults.has(ck)) {
      defaults.set(ck, rawValue as number | string | boolean)
    }
  }

  cachedSettings = defaults
  cacheTimestamp = now
  return defaults
}

export function invalidatePlatformSettingsCache() {
  cachedSettings = null
  cacheTimestamp = 0
}

export async function getPlatformSetting<T extends number | string | boolean>(
  adminClient: SupabaseClient,
  category: SettingCategory,
  key: string
): Promise<T> {
  const settings = await loadPlatformSettings(adminClient)
  const ck = compositeKey(category, key)
  const value = settings.get(ck)
  if (value !== undefined) return value as T

  const def = SETTING_DEFINITIONS.find((d) => d.category === category && d.key === key)
  return (def?.defaultValue ?? 0) as T
}

export function getPlatformSettingSync<T extends number | string | boolean>(
  category: SettingCategory,
  key: string
): T {
  const ck = compositeKey(category, key)
  if (cachedSettings) {
    const value = cachedSettings.get(ck)
    if (value !== undefined) return value as T
  }
  const def = SETTING_DEFINITIONS.find((d) => d.category === category && d.key === key)
  return (def?.defaultValue ?? 0) as T
}

// ---------------------------------------------------------------------------
// Settings writer (admin API)
// ---------------------------------------------------------------------------

export type SettingUpdate = {
  category: SettingCategory
  key: string
  value: number | string | boolean
}

export async function savePlatformSettings(
  adminClient: SupabaseClient,
  updates: SettingUpdate[],
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const valid = updates.filter((u) => {
    const def = SETTING_DEFINITIONS.find((d) => d.category === u.category && d.key === u.key)
    if (!def) return false
    if (def.type === 'number') {
      const num = Number(u.value)
      if (Number.isNaN(num)) return false
      if (def.min !== undefined && num < def.min) return false
      if (def.max !== undefined && num > def.max) return false
    }
    return true
  })

  if (valid.length === 0) {
    return { ok: false, error: 'No valid settings to update.' }
  }

  const now = new Date().toISOString()
  const rows = valid.map((u) => {
    const def = SETTING_DEFINITIONS.find((d) => d.category === u.category && d.key === u.key)!
    return {
      category: u.category,
      key: u.key,
      value: { v: u.value },
      label: def.label,
      description: def.description,
      updated_by: userId,
      updated_at: now,
    }
  })

  const { error } = await adminClient.from('platform_settings').upsert(rows, {
    onConflict: 'category,key',
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  invalidatePlatformSettingsCache()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Read all settings for admin UI
// ---------------------------------------------------------------------------

export type SettingRow = {
  category: SettingCategory
  key: string
  label: string
  description: string
  defaultValue: number | string | boolean
  currentValue: number | string | boolean
  type: 'number' | 'string' | 'boolean'
  min?: number
  max?: number
  unit?: string
  warning?: string
  isOverridden: boolean
}

export async function listPlatformSettings(
  adminClient: SupabaseClient
): Promise<SettingRow[]> {
  const { data: dbRows } = await adminClient
    .from('platform_settings')
    .select('category, key, value')

  const overrides = new Map<string, unknown>()
  for (const row of dbRows ?? []) {
    overrides.set(compositeKey(row.category, row.key), (row.value as { v?: unknown })?.v)
  }

  return SETTING_DEFINITIONS.map((def) => {
    const ck = compositeKey(def.category, def.key)
    const override = overrides.get(ck)
    const isOverridden = override !== undefined
    return {
      category: def.category,
      key: def.key,
      label: def.label,
      description: def.description,
      defaultValue: def.defaultValue,
      currentValue: isOverridden ? (override as number | string | boolean) : def.defaultValue,
      type: def.type,
      min: def.min,
      max: def.max,
      unit: def.unit,
      warning: def.warning,
      isOverridden,
    }
  })
}
