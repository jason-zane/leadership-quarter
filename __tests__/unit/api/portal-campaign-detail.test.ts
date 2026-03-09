import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))
vi.mock('@/utils/services/portal-campaign-detail', () => ({
  getPortalCampaignDetail: vi.fn(),
  updatePortalCampaign: vi.fn(),
}))

import { GET, PATCH } from '@/app/api/portal/campaigns/[id]/route'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import {
  getPortalCampaignDetail,
  updatePortalCampaign,
} from '@/utils/services/portal-campaign-detail'

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
})

describe('GET /api/portal/campaigns/[id]', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(401, 'unauthorized') as never)

    const res = await GET(new Request('http://localhost/api/portal/campaigns/camp-1'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns the campaign detail from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(getPortalCampaignDetail).mockResolvedValue({
      ok: true,
      data: { campaign: { id: 'camp-1', name: 'Pilot' } },
    })

    const res = await GET(new Request('http://localhost/api/portal/campaigns/camp-1'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, campaign: { id: 'camp-1', name: 'Pilot' } })
  })

  it('maps not found errors to 404', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(getPortalCampaignDetail).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await GET(new Request('http://localhost/api/portal/campaigns/camp-1'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/portal/campaigns/[id]', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(403, 'forbidden') as never)

    const res = await PATCH(
      new Request('http://localhost/api/portal/campaigns/camp-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(403)
  })

  it('returns updated campaign data from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(updatePortalCampaign).mockResolvedValue({
      ok: true,
      data: { campaign: { id: 'camp-1', status: 'active' } },
    })

    const res = await PATCH(
      new Request('http://localhost/api/portal/campaigns/camp-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, campaign: { id: 'camp-1', status: 'active' } })
  })

  it('maps validation errors to 400', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(updatePortalCampaign).mockResolvedValue({
      ok: false,
      error: 'validation_error',
      message: 'Invalid payload.',
    })

    const res = await PATCH(
      new Request('http://localhost/api/portal/campaigns/camp-1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('maps internal errors to 500', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(updatePortalCampaign).mockResolvedValue({
      ok: false,
      error: 'internal_error',
      message: 'Failed to update campaign.',
    })

    const res = await PATCH(
      new Request('http://localhost/api/portal/campaigns/camp-1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(500)
  })
})
