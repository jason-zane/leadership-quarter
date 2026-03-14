import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))

import { GET } from '@/app/api/admin/organisations/[id]/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

function makeAuthSuccess(input: {
  role: 'admin' | 'staff'
  portalAdminAccess: boolean
  organisationStatus?: 'active' | 'inactive'
}) {
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
                  data: { role: input.role, portal_admin_access: input.portalAdminAccess },
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
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'org-1',
                    name: 'Acme',
                    slug: 'acme',
                    website: null,
                    status: input.organisationStatus ?? 'active',
                    created_at: '2026-03-01T00:00:00Z',
                    updated_at: '2026-03-01T00:00:00Z',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin organisation detail route', () => {
  it('reports portal launch as available for allowed admins on active clients', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(
      makeAuthSuccess({ role: 'admin', portalAdminAccess: true }) as never
    )

    const response = await GET(new Request('http://localhost/api/admin/organisations/org-1'), {
      params: Promise.resolve({ id: 'org-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.viewer.canLaunchPortal).toBe(true)
    expect(body.viewer.portalLaunchReason).toBe('available')
  })

  it('reports launch as unavailable when the viewer lacks bypass access', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(
      makeAuthSuccess({ role: 'admin', portalAdminAccess: false }) as never
    )

    const response = await GET(new Request('http://localhost/api/admin/organisations/org-1'), {
      params: Promise.resolve({ id: 'org-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.viewer.canLaunchPortal).toBe(false)
    expect(body.viewer.portalLaunchReason).toBe('viewer_lacks_access')
  })

  it('reports launch as unavailable for inactive clients even when the viewer is allowed', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(
      makeAuthSuccess({ role: 'admin', portalAdminAccess: true, organisationStatus: 'inactive' }) as never
    )

    const response = await GET(new Request('http://localhost/api/admin/organisations/org-1'), {
      params: Promise.resolve({ id: 'org-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.viewer.canLaunchPortal).toBe(false)
    expect(body.viewer.portalLaunchReason).toBe('organisation_unavailable')
  })
})
