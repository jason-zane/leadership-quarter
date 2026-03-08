import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))

import { GET } from '@/app/api/portal/me/route'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    email: 'user@example.com',
    organisationId: 'org-1',
    organisationSlug: 'acme',
    role: 'org_member',
    membershipStatus: 'active',
    source: 'membership',
    isBypassAdmin: false,
    permissions: { canViewReports: true, canManageMembers: false },
    ...overrides,
  }
}

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'user-1', email: 'user@example.com' },
    context: makeContext(),
    adminClient: {},
  }
}

function makeAuthFailure(status: number, error: string) {
  return {
    ok: false as const,
    response: NextResponse.json({ ok: false, error }, { status }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => vi.clearAllMocks())

describe('GET /api/portal/me', () => {
  it('valid portal session → 200 with context', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.context.organisationSlug).toBe('acme')
    expect(body.context.role).toBe('org_member')
  })

  it('no session → 401', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(401, 'unauthorized') as never)

    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('no membership → 403', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(403, 'forbidden') as never)

    const res = await GET()
    expect(res.status).toBe(403)
  })
})
