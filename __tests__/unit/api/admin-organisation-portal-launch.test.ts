import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/auth-handoff', () => ({
  getAuthHandoffUrl: vi.fn(),
  writeAuthHandoffCookie: vi.fn(),
}))
vi.mock('@/utils/security/request-origin', () => ({
  isAllowedRequestOrigin: vi.fn(),
}))
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { GET, POST } from '@/app/api/admin/organisations/[id]/portal-launch/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getAuthHandoffUrl, writeAuthHandoffCookie } from '@/utils/auth-handoff'
import { isAllowedRequestOrigin } from '@/utils/security/request-origin'
import { createClient } from '@/utils/supabase/server'

function makeAuthSuccess(portalAdminAccess: boolean) {
  return {
    ok: true as const,
    user: { id: 'admin-user' },
    role: 'admin' as const,
    adminClient: {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'admin', portal_admin_access: portalAdminAccess },
                  error: null,
                }),
              })),
            })),
          }
        }

        if (table === 'organisations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'org-1', slug: 'acme', status: 'active' },
                    error: null,
                  }),
                })),
              })),
            })),
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
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthHandoffUrl).mockReturnValue('https://portal.example.com/auth/handoff')
  vi.mocked(writeAuthHandoffCookie).mockResolvedValue(true)
  vi.mocked(isAllowedRequestOrigin).mockReturnValue(true)
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
          },
        },
      }),
    },
  } as never)
})

describe('admin organisation portal launch route', () => {
  it('returns 405 for GET requests', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(405)
    expect(body.error).toBe('method_not_allowed')
  })

  it('creates a portal handoff for allowlisted admins', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess(true) as never)

    const response = await POST(new Request('http://localhost/api/admin/organisations/org-1/portal-launch', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3001',
      },
    }), {
      params: Promise.resolve({ id: 'org-1' }),
    })

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('https://portal.example.com/auth/handoff')
    expect(writeAuthHandoffCookie).toHaveBeenCalledWith({
      surface: 'portal',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      redirectPath: '/portal/admin/launch?organisation_id=org-1',
    })
  })

  it('rejects admins who are not allowlisted for portal launch', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess(false) as never)

    const response = await POST(new Request('http://localhost/api/admin/organisations/org-1/portal-launch', {
      method: 'POST',
      headers: {
        origin: 'http://localhost:3001',
      },
    }), {
      params: Promise.resolve({ id: 'org-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('forbidden')
    expect(writeAuthHandoffCookie).not.toHaveBeenCalled()
  })

  it('rejects invalid origins before creating a portal handoff', async () => {
    vi.mocked(isAllowedRequestOrigin).mockReturnValue(false)

    const response = await POST(new Request('http://localhost/api/admin/organisations/org-1/portal-launch', {
      method: 'POST',
    }), {
      params: Promise.resolve({ id: 'org-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('invalid_origin')
    expect(writeAuthHandoffCookie).not.toHaveBeenCalled()
  })
})
