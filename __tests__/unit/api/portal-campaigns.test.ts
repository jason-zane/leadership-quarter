import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))
vi.mock('@/utils/services/portal-campaigns', () => ({
  listPortalCampaigns: vi.fn(),
  parsePortalCampaignsQuery: vi.fn(),
  createPortalCampaign: vi.fn(),
}))

import { GET, POST } from '@/app/api/portal/campaigns/route'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import {
  createPortalCampaign,
  listPortalCampaigns,
  parsePortalCampaignsQuery,
} from '@/utils/services/portal-campaigns'

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'user-1', email: 'user@example.com' },
    context: {
      organisationId: 'org-1',
      organisationSlug: 'acme',
      role: 'campaign_manager',
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
  vi.mocked(parsePortalCampaignsQuery).mockReturnValue({
    includeArchived: false,
    page: 1,
    pageSize: 25,
  })
})

describe('GET /api/portal/campaigns', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(401, 'unauthorized') as never)

    const res = await GET(new Request('http://localhost/api/portal/campaigns'))

    expect(res.status).toBe(401)
  })

  it('returns campaign data from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listPortalCampaigns).mockResolvedValue({
      ok: true,
      data: {
        campaigns: [{ id: 'camp-1' }],
        includeArchived: false,
        pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      },
    })

    const res = await GET(new Request('http://localhost/api/portal/campaigns?page=1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.campaigns).toEqual([{ id: 'camp-1' }])
  })

  it('maps service failures to 500', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listPortalCampaigns).mockResolvedValue({
      ok: false,
      error: 'internal_error',
      message: 'Failed to load campaigns.',
    })

    const res = await GET(new Request('http://localhost/api/portal/campaigns'))

    expect(res.status).toBe(500)
  })
})

describe('POST /api/portal/campaigns', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(403, 'forbidden') as never)

    const res = await POST(
      new Request('http://localhost/api/portal/campaigns', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(res.status).toBe(403)
  })

  it('returns created campaign from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(createPortalCampaign).mockResolvedValue({
      ok: true,
      data: { campaign: { id: 'camp-1', slug: 'pilot' } },
    })

    const res = await POST(
      new Request('http://localhost/api/portal/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Pilot', assessment_ids: ['assess-1'] }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toEqual({ ok: true, campaign: { id: 'camp-1', slug: 'pilot' } })
  })

  it('maps forbidden errors to 403', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(createPortalCampaign).mockResolvedValue({
      ok: false,
      error: 'forbidden',
      message: 'One or more assessments are not assigned to your organisation.',
    })

    const res = await POST(
      new Request('http://localhost/api/portal/campaigns', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(res.status).toBe(403)
  })

  it('maps slug conflicts to 409', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(createPortalCampaign).mockResolvedValue({
      ok: false,
      error: 'conflict',
      message: 'Campaign slug is already in use.',
    })

    const res = await POST(
      new Request('http://localhost/api/portal/campaigns', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(res.status).toBe(409)
  })
})
