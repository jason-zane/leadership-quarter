import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/admin-organisations', () => ({
  parseOrganisationPagination: vi.fn(),
  listAdminOrganisations: vi.fn(),
  createAdminOrganisation: vi.fn(),
}))

import { GET, POST } from '@/app/api/admin/organisations/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  createAdminOrganisation,
  listAdminOrganisations,
  parseOrganisationPagination,
} from '@/utils/services/admin-organisations'

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'admin-user' },
    role: 'admin' as const,
    adminClient: {},
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
  vi.mocked(parseOrganisationPagination).mockReturnValue({ page: 1, pageSize: 50 })
})

describe('admin organisations routes', () => {
  it('lists organisations', async () => {
    vi.mocked(listAdminOrganisations).mockResolvedValue({
      ok: true,
      data: {
        organisations: [{ id: 'org-1' }],
        pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
      },
    })

    const res = await GET(new Request('http://localhost/api/admin/organisations?page=1&pageSize=50'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.organisations).toHaveLength(1)
  })

  it('maps invalid organisation creation payloads to 400', async () => {
    vi.mocked(createAdminOrganisation).mockResolvedValue({
      ok: false,
      error: 'name_required',
    })

    const res = await POST(
      new Request('http://localhost/api/admin/organisations', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(res.status).toBe(400)
  })

  it('maps duplicate slugs to 409', async () => {
    vi.mocked(createAdminOrganisation).mockResolvedValue({
      ok: false,
      error: 'slug_taken',
    })

    const res = await POST(
      new Request('http://localhost/api/admin/organisations', {
        method: 'POST',
        body: JSON.stringify({ name: 'Org' }),
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(res.status).toBe(409)
  })
})
