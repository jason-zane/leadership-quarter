import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import {
  invalidatePlatformSettingsCache,
  savePlatformSettings,
} from '@/utils/services/platform-settings'
import {
  emailSettingFor,
  rateLimitFor,
  reportAccessTtlSeconds,
  warmPlatformSettings,
} from '@/utils/services/platform-settings-runtime'

function createAdminClientMock(options?: {
  settingsRows?: Array<{ category: string; key: string; value: { v: unknown } }>
}) {
  const platformSettingsSelect = vi.fn().mockResolvedValue({
    data: options?.settingsRows ?? [],
    error: null,
  })
  const platformSettingsUpsert = vi.fn().mockResolvedValue({ error: null })

  return {
    from: vi.fn((table: string) => {
      if (table === 'platform_settings') {
        return {
          select: platformSettingsSelect,
          upsert: platformSettingsUpsert,
        }
      }
      return {}
    }),
    platformSettingsSelect,
    platformSettingsUpsert,
  }
}

beforeEach(() => {
  invalidatePlatformSettingsCache()
  vi.clearAllMocks()
})

describe('platform settings runtime', () => {
  it('uses defaults until the cache is warmed, then reflects overrides', async () => {
    expect(rateLimitFor('admin_api_rpm')).toBe(120)
    expect(reportAccessTtlSeconds()).toBe(7 * 24 * 60 * 60)

    const adminClient = createAdminClientMock({
      settingsRows: [
        { category: 'rate_limits', key: 'admin_api_rpm', value: { v: 55 } },
        { category: 'tokens', key: 'report_access_ttl_days', value: { v: 3 } },
      ],
    })

    await warmPlatformSettings(adminClient as never)

    expect(rateLimitFor('admin_api_rpm')).toBe(55)
    expect(reportAccessTtlSeconds()).toBe(3 * 24 * 60 * 60)
  })

  it('invalidates the cache after settings are saved so the next warm picks up new values', async () => {
    const firstClient = createAdminClientMock({
      settingsRows: [{ category: 'email', key: 'email_batch_size', value: { v: 20 } }],
    })

    await warmPlatformSettings(firstClient as never)

    const saveClient = createAdminClientMock()
    await savePlatformSettings(
      saveClient as never,
      [{ category: 'email', key: 'email_batch_size', value: 42 }],
      'user-1'
    )

    const refreshedClient = createAdminClientMock({
      settingsRows: [{ category: 'email', key: 'email_batch_size', value: { v: 42 } }],
    })

    await warmPlatformSettings(refreshedClient as never)

    expect(refreshedClient.platformSettingsSelect).toHaveBeenCalled()
    expect(emailSettingFor('email_batch_size')).toBe(42)
  })
})
