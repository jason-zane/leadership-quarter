import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/organisation-members', () => ({
  attachOrganisationMember: vi.fn(),
}))

import { POST } from '@/app/api/admin/organisations/[id]/members/attach/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { attachOrganisationMember } from '@/utils/services/organisation-members'

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'admin-1' },
    role: 'admin' as const,
    adminClient: { from: vi.fn(), auth: { admin: {} } },
  }
}

function makeAuthFailure(status = 401) {
  return {
    ok: false as const,
    response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status }),
  }
}

const params = Promise.resolve({ id: 'org-1' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/admin/organisations/[id]/members/attach', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthFailure(403) as never)

    const req = new NextRequest('http://localhost/api/admin/organisations/org-1/members/attach', {
      method: 'POST',
      body: JSON.stringify({ email: 'member@example.com', role: 'viewer' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(403)
  })

  it('returns the attached member from the service', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(attachOrganisationMember).mockResolvedValue({
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
          created_at: '',
          updated_at: '',
          email: 'member@example.com',
        },
      },
    })

    const req = new NextRequest('http://localhost/api/admin/organisations/org-1/members/attach', {
      method: 'POST',
      body: JSON.stringify({ email: 'member@example.com', role: 'org_admin' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.member.status).toBe('active')
  })

  it('maps missing users to 404', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(attachOrganisationMember).mockResolvedValue({
      ok: false,
      error: 'user_not_found',
    })

    const req = new NextRequest('http://localhost/api/admin/organisations/org-1/members/attach', {
      method: 'POST',
      body: JSON.stringify({ email: 'missing@example.com', role: 'viewer' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(404)
  })

  it('maps membership conflicts to 409 and preserves the message', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(attachOrganisationMember).mockResolvedValue({
      ok: false,
      error: 'membership_conflict',
      message: 'User already has client access in Acme.',
    })

    const req = new NextRequest('http://localhost/api/admin/organisations/org-1/members/attach', {
      method: 'POST',
      body: JSON.stringify({ email: 'member@example.com', role: 'viewer' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body).toEqual({
      ok: false,
      error: 'membership_conflict',
      message: 'User already has client access in Acme.',
    })
  })
})
