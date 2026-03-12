import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/admin-organisations', () => ({
  deleteAdminOrganisation: vi.fn(),
}))

import { DELETE, GET } from '@/app/api/admin/organisations/[id]/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { deleteAdminOrganisation } from '@/utils/services/admin-organisations'

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'admin-user' },
    role: 'admin' as const,
    adminClient: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'org-1',
                name: 'Acme',
                slug: 'acme',
                website: 'https://acme.test',
                status: 'active',
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-01-02T00:00:00.000Z',
              },
              error: null,
            }),
          })),
        })),
      })),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
})

describe('admin organisation detail route', () => {
  it('returns the organisation on GET', async () => {
    const res = await GET(new Request('http://localhost/api/admin/organisations/org-1'), {
      params: Promise.resolve({ id: 'org-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.organisation.name).toBe('Acme')
  })

  it('maps not found deletes to 404', async () => {
    vi.mocked(deleteAdminOrganisation).mockResolvedValue({
      ok: false,
      error: 'organisation_not_found',
    })

    const res = await DELETE(new Request('http://localhost/api/admin/organisations/org-1', {
      method: 'DELETE',
    }), {
      params: Promise.resolve({ id: 'org-1' }),
    })

    expect(res.status).toBe(404)
  })

  it('deletes organisations on success', async () => {
    vi.mocked(deleteAdminOrganisation).mockResolvedValue({ ok: true })

    const res = await DELETE(
      new Request('http://localhost/api/admin/organisations/org-1', {
        method: 'DELETE',
      }),
      {
        params: Promise.resolve({ id: 'org-1' }),
      }
    )

    expect(res.status).toBe(200)
  })
})
