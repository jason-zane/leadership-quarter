import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/organisation-members', () => ({
  listOrganisationMembers: vi.fn(),
  inviteOrganisationMember: vi.fn(),
}))

import { GET, POST } from '@/app/api/admin/organisations/[id]/members/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  inviteOrganisationMember,
  listOrganisationMembers,
} from '@/utils/services/organisation-members'

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

describe('GET /api/admin/organisations/[id]/members', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthFailure() as never)

    const res = await GET(new Request('http://localhost/api/admin/organisations/org-1/members'), {
      params,
    })

    expect(res.status).toBe(401)
  })

  it('returns members from the service', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listOrganisationMembers).mockResolvedValue({
      ok: true,
      data: {
        members: [
          {
            id: 'm-1',
            organisation_id: 'org-1',
            user_id: 'user-1',
            role: 'viewer',
            status: 'invited',
            invited_at: null,
            accepted_at: null,
            created_at: '',
            updated_at: '',
            email: 'member@example.com',
          },
        ],
      },
    })

    const res = await GET(new Request('http://localhost/api/admin/organisations/org-1/members'), {
      params,
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.members).toHaveLength(1)
  })

  it('maps service failure to 500', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listOrganisationMembers).mockResolvedValue({
      ok: false,
      error: 'members_list_failed',
    })

    const res = await GET(new Request('http://localhost/api/admin/organisations/org-1/members'), {
      params,
    })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('members_list_failed')
  })
})

describe('POST /api/admin/organisations/[id]/members', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthFailure(403) as never)

    const req = new NextRequest('http://localhost/api/admin/organisations/org-1/members', {
      method: 'POST',
      body: JSON.stringify({ email: 'member@example.com', role: 'viewer' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(403)
  })

  it('returns created member from the service', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(inviteOrganisationMember).mockResolvedValue({
      ok: true,
      data: {
        member: {
          id: 'm-1',
          organisation_id: 'org-1',
          user_id: 'user-1',
          role: 'viewer',
          status: 'invited',
          invited_at: null,
          accepted_at: null,
          created_at: '',
          updated_at: '',
          email: 'member@example.com',
        },
        delivery: 'email',
      },
    })

    const req = new NextRequest('http://localhost/api/admin/organisations/org-1/members', {
      method: 'POST',
      body: JSON.stringify({ email: 'member@example.com', role: 'viewer' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.member.email).toBe('member@example.com')
  })

  it('maps invalid payload to 400', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(inviteOrganisationMember).mockResolvedValue({
      ok: false,
      error: 'invalid_payload',
    })

    const req = new NextRequest('http://localhost/api/admin/organisations/org-1/members', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req, { params })

    expect(res.status).toBe(400)
  })

  it('preserves service message for 500 failures', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(inviteOrganisationMember).mockResolvedValue({
      ok: false,
      error: 'membership_upsert_failed',
      message: 'duplicate key',
    })

    const req = new NextRequest('http://localhost/api/admin/organisations/org-1/members', {
      method: 'POST',
      body: JSON.stringify({ email: 'member@example.com', role: 'viewer' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({
      ok: false,
      error: 'membership_upsert_failed',
      message: 'duplicate key',
    })
  })
})
