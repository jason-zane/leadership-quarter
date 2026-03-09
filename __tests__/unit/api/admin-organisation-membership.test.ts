import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/organisation-members', () => ({
  updateOrganisationMember: vi.fn(),
  deleteOrganisationMember: vi.fn(),
}))

import {
  DELETE as deleteOrganisationMemberRoute,
  PATCH as patchOrganisationMemberRoute,
} from '@/app/api/admin/organisations/[id]/members/[membershipId]/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  deleteOrganisationMember,
  updateOrganisationMember,
} from '@/utils/services/organisation-members'

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
})

describe('admin organisation membership detail route', () => {
  it('maps invalid membership updates to 400', async () => {
    vi.mocked(updateOrganisationMember).mockResolvedValue({
      ok: false,
      error: 'invalid_role',
    })

    const res = await patchOrganisationMemberRoute(
      new Request('http://localhost/api/admin/organisations/org-1/members/m-1', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'bad' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'org-1', membershipId: 'm-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('returns the updated member on success', async () => {
    vi.mocked(updateOrganisationMember).mockResolvedValue({
      ok: true,
      data: {
        member: {
          id: 'm-1',
          organisation_id: 'org-1',
          user_id: 'user-1',
          role: 'org_admin',
          status: 'active',
          invited_at: null,
          accepted_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      },
    })

    const res = await patchOrganisationMemberRoute(
      new Request('http://localhost/api/admin/organisations/org-1/members/m-1', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'org_admin' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'org-1', membershipId: 'm-1' }) }
    )

    expect(res.status).toBe(200)
  })

  it('deletes memberships on success', async () => {
    vi.mocked(deleteOrganisationMember).mockResolvedValue({ ok: true })

    const res = await deleteOrganisationMemberRoute(
      new Request('http://localhost/api/admin/organisations/org-1/members/m-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'org-1', membershipId: 'm-1' }) }
    )

    expect(res.status).toBe(200)
  })
})
