import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/hosts', () => ({ getPortalBaseUrl: vi.fn().mockReturnValue('https://portal.example.com') }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/portal-campaign-invitations', () => ({
  listPortalCampaignInvitations: vi.fn(),
  createPortalCampaignInvitations: vi.fn(),
}))

import { GET, POST } from '@/app/api/portal/campaigns/[id]/invitations/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import {
  createPortalCampaignInvitations,
  listPortalCampaignInvitations,
} from '@/utils/services/portal-campaign-invitations'

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
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    limit: 6,
    remaining: 5,
    reset: 0,
  })
})

describe('GET /api/portal/campaigns/[id]/invitations', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(401, 'unauthorized') as never)

    const res = await GET(new Request('http://localhost/api/portal/campaigns/camp-1/invitations'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns invitation data from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listPortalCampaignInvitations).mockResolvedValue({
      ok: true,
      data: { invitations: [{ id: 'inv-1' }] },
    })

    const res = await GET(new Request('http://localhost/api/portal/campaigns/camp-1/invitations'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, invitations: [{ id: 'inv-1' }] })
  })

  it('maps not found errors to 404', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listPortalCampaignInvitations).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await GET(new Request('http://localhost/api/portal/campaigns/camp-1/invitations'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(404)
  })
})

describe('POST /api/portal/campaigns/[id]/invitations', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(403, 'forbidden') as never)

    const res = await POST(new Request('http://localhost/api/portal/campaigns/camp-1/invitations', {
      method: 'POST',
      body: JSON.stringify({ invitations: [] }),
    }), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(403)
  })

  it('returns created invitations from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(createPortalCampaignInvitations).mockResolvedValue({
      ok: true,
      data: {
        invitations: [{ id: 'inv-1', email: 'ada@example.com' }],
        errors: [{ row_index: 1, code: 'invalid_email', message: 'Invalid email address.' }],
      },
    })

    const res = await POST(new Request('http://localhost/api/portal/campaigns/camp-1/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ send_now: true, invitations: [{ email: 'ada@example.com' }] }),
    }), {
      params: Promise.resolve({ id: 'camp-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.ok).toBe(true)
    expect(createPortalCampaignInvitations).toHaveBeenCalledWith({
      adminClient: {},
      organisationId: 'org-1',
      userId: 'user-1',
      campaignId: 'camp-1',
      portalBaseUrl: 'https://portal.example.com',
      payload: { send_now: true, invitations: [{ email: 'ada@example.com' }] },
    })
  })

  it('maps validation errors to 400', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(createPortalCampaignInvitations).mockResolvedValue({
      ok: false,
      error: 'validation_error',
      message: 'At least one invitation is required.',
    })

    const res = await POST(new Request('http://localhost/api/portal/campaigns/camp-1/invitations', {
      method: 'POST',
      body: JSON.stringify({}),
    }), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(400)
  })

  it('maps internal errors to 500', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(createPortalCampaignInvitations).mockResolvedValue({
      ok: false,
      error: 'internal_error',
      message: 'Failed to create invitations.',
    })

    const res = await POST(new Request('http://localhost/api/portal/campaigns/camp-1/invitations', {
      method: 'POST',
      body: JSON.stringify({}),
    }), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(500)
  })

  it('returns 429 when invitation creation is rate limited', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 6,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await POST(new Request('http://localhost/api/portal/campaigns/camp-1/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ send_now: true, invitations: [{ email: 'ada@example.com' }] }),
    }), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(429)
  })
})
