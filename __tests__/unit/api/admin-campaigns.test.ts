import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))

import { GET, POST } from '@/app/api/admin/campaigns/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAuthSuccess(role: 'admin' | 'staff' = 'admin') {
  const campaignsFrom = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }
  const campaignAssessmentsFrom = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  }
  const adminClient = {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') return campaignsFrom
      if (table === 'campaign_assessments') return campaignAssessmentsFrom
      return {}
    }),
  }
  return {
    ok: true as const,
    user: { id: 'user-1' },
    role,
    adminClient,
    _campaignsFrom: campaignsFrom,
  }
}

function makeAuthFailure(status = 401) {
  return {
    ok: false as const,
    response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status }),
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/campaigns
// ---------------------------------------------------------------------------

describe('GET /api/admin/campaigns', () => {
  beforeEach(() => vi.clearAllMocks())

  it('valid session → 200 with campaigns array', async () => {
    const auth = makeAuthSuccess()
    auth._campaignsFrom.order.mockResolvedValue({ data: [{ id: 'c1', name: 'Campaign 1' }], error: null })
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(auth as never)

    const res = await GET(new NextRequest('http://localhost/api/admin/campaigns'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.campaigns).toHaveLength(1)
  })

  it('DB error → 500', async () => {
    const auth = makeAuthSuccess()
    auth._campaignsFrom.order.mockResolvedValue({ data: null, error: { message: 'db err' } })
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(auth as never)

    const res = await GET(new NextRequest('http://localhost/api/admin/campaigns'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.ok).toBe(false)
  })

  it('no session → 401 from requireDashboardApiAuth', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthFailure() as never)

    const res = await GET(new NextRequest('http://localhost/api/admin/campaigns'))
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// POST /api/admin/campaigns
// ---------------------------------------------------------------------------

describe('POST /api/admin/campaigns', () => {
  beforeEach(() => vi.clearAllMocks())

  it('missing name → 400', async () => {
    const auth = makeAuthSuccess()
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(auth as never)

    const req = new NextRequest('http://localhost/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify({ slug: 'test-slug' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('name_required')
  })

  it('valid payload → 201 with campaign', async () => {
    const auth = makeAuthSuccess()
    auth._campaignsFrom.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'c-new',
            name: 'New Campaign',
            external_name: 'New Campaign',
            slug: 'new-campaign',
            status: 'draft',
            config: {},
            created_at: '',
          },
          error: null,
        }),
      }),
    })
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(auth as never)

    const req = new NextRequest('http://localhost/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Campaign', external_name: 'New Campaign' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.ok).toBe(true)
    expect(body.campaign.id).toBe('c-new')
    expect(body.campaign.external_name).toBe('New Campaign')
  })

  it('duplicate slug → 409', async () => {
    const auth = makeAuthSuccess()
    auth._campaignsFrom.insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'duplicate' },
        }),
      }),
    })
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(auth as never)

    const req = new NextRequest('http://localhost/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        name: 'My Campaign',
        external_name: 'My Campaign',
        slug: 'existing-slug',
      }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('slug_taken')
  })

  it('non-admin user → 403', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthFailure(403) as never)

    const req = new NextRequest('http://localhost/api/admin/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
