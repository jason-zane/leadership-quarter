import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))
vi.mock('@/utils/services/portal-overview', () => ({
  getPortalOverview: vi.fn(),
}))

import { GET } from '@/app/api/portal/overview/route'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { getPortalOverview } from '@/utils/services/portal-overview'

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'user-1', email: 'user@example.com' },
    context: {
      organisationId: 'org-1',
      organisationSlug: 'acme',
      role: 'viewer',
    },
    adminClient: {},
  }
}

function makeAuthFailure(status: number, error: string) {
  return {
    ok: false as const,
    response: NextResponse.json({ ok: false, error }, { status }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/portal/overview', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(401, 'unauthorized') as never)

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('returns overview data from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(getPortalOverview).mockResolvedValue({
      ok: true,
      data: {
        metrics: {
          campaigns_total: 1,
          campaigns_active: 1,
          invitations_total: 4,
          submissions_total: 2,
          average_score: 3.5,
        },
        campaigns_by_status: {
          draft: 0,
          active: 1,
          closed: 0,
          archived: 0,
        },
        recent_results: [],
      },
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.metrics.campaigns_total).toBe(1)
  })

  it('maps service failures to 500', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(getPortalOverview).mockResolvedValue({
      ok: false,
      error: 'internal_error',
      message: 'Failed to load portal overview.',
    })

    const res = await GET()

    expect(res.status).toBe(500)
  })
})
