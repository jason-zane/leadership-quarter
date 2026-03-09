import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/site-cta-bindings', () => ({
  listSiteCtaBindings: vi.fn(),
  saveSiteCtaBindings: vi.fn(),
}))

import { GET, PUT } from '@/app/api/admin/site/cta-bindings/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { listSiteCtaBindings, saveSiteCtaBindings } from '@/utils/services/site-cta-bindings'

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

describe('admin site CTA bindings routes', () => {
  it('lists bindings', async () => {
    vi.mocked(listSiteCtaBindings).mockResolvedValue({
      ok: true,
      data: { bindings: [{ slot: 'ai_readiness_orientation_primary', campaign_slug: null }] },
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.bindings).toHaveLength(1)
  })

  it('maps invalid binding payloads to 400', async () => {
    vi.mocked(saveSiteCtaBindings).mockResolvedValue({
      ok: false,
      error: 'invalid_slot',
    })

    const res = await PUT(
      new Request('http://localhost/api/admin/site/cta-bindings', {
        method: 'PUT',
        body: JSON.stringify({ bindings: [] }),
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(res.status).toBe(400)
  })

  it('returns bindings after save', async () => {
    vi.mocked(saveSiteCtaBindings).mockResolvedValue({
      ok: true,
      data: { bindings: [{ slot: 'ai_readiness_orientation_primary', campaign_slug: 'active-campaign' }] },
    })

    const res = await PUT(
      new Request('http://localhost/api/admin/site/cta-bindings', {
        method: 'PUT',
        body: JSON.stringify({
          bindings: [{ slot: 'ai_readiness_orientation_primary', campaign_slug: 'active-campaign' }],
        }),
        headers: { 'content-type': 'application/json' },
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.bindings[0].campaign_slug).toBe('active-campaign')
  })
})
