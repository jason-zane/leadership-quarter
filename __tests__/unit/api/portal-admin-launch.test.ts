import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

import { GET } from '@/app/portal/admin/launch/route'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

function makePortalLaunchAdminClient(options?: {
  profile?: { role?: 'admin' | 'staff' | null; portal_admin_access?: boolean | null } | null
  organisation?: { id: string; slug: string } | null
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: options?.profile ?? null,
            error: null,
          }),
        }
      }

      if (table === 'organisations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: options?.organisation ?? null,
            error: null,
          }),
        }
      }

      if (table === 'admin_audit_logs') {
        return {
          insert: vi.fn().mockReturnValue({
            then: (resolve: () => void) => resolve(),
          }),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTH_HANDOFF_SECRET = 'test-secret'
})

describe('GET /portal/admin/launch', () => {
  it('redirects unauthenticated users back to client login', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never)

    const response = await GET(new Request('https://portal.example.com/portal/admin/launch?organisation_id=org-1'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://portal.example.com/client-login?error=unauthorized')
  })

  it('creates a short-lived bypass session for allowlisted admins', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'admin-user', email: 'admin@example.com' },
          },
        }),
      },
    } as never)
    vi.mocked(createAdminClient).mockReturnValue(
      makePortalLaunchAdminClient({
        profile: { role: 'admin', portal_admin_access: true },
        organisation: { id: 'org-1', slug: 'acme' },
      }) as never
    )

    const response = await GET(new Request('https://portal.example.com/portal/admin/launch?organisation_id=org-1'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://portal.example.com/portal')
    const setCookie = response.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('lq_portal_bypass=')
    expect(setCookie).toContain('lq_portal_org_id=org-1')
  })
})
