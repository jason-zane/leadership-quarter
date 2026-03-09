import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/portal-campaign-workspace', () => ({
  exportPortalCampaignResponsesCsv: vi.fn(),
  getPortalCampaignAnalytics: vi.fn(),
  listPortalCampaignResponses: vi.fn(),
}))

import { GET as getCampaignExport } from '@/app/api/portal/campaigns/[id]/exports/route'
import { GET as getCampaignAnalytics } from '@/app/api/portal/campaigns/[id]/analytics/route'
import { GET as getCampaignResponses } from '@/app/api/portal/campaigns/[id]/responses/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import {
  exportPortalCampaignResponsesCsv,
  getPortalCampaignAnalytics,
  listPortalCampaignResponses,
} from '@/utils/services/portal-campaign-workspace'

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
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    limit: 12,
    remaining: 11,
    reset: 0,
  })
})

describe('GET /api/portal/campaigns/[id]/exports', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(401, 'unauthorized') as never)

    const res = await getCampaignExport(new Request('http://localhost/api/portal/campaigns/camp-1/exports'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(401)
  })

  it('returns csv output from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(exportPortalCampaignResponsesCsv).mockResolvedValue({
      ok: true,
      data: {
        csv: 'col1,col2\nvalue1,value2',
        filename: 'campaign-pilot-responses.csv',
      },
    })

    const res = await getCampaignExport(new Request('http://localhost/api/portal/campaigns/camp-1/exports'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="campaign-pilot-responses.csv"'
    )
    expect(await res.text()).toBe('col1,col2\nvalue1,value2')
  })

  it('returns 429 when export is rate limited', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 12,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await getCampaignExport(new Request('http://localhost/api/portal/campaigns/camp-1/exports'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(429)
  })

  it('maps not found errors to 404', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(exportPortalCampaignResponsesCsv).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await getCampaignExport(new Request('http://localhost/api/portal/campaigns/camp-1/exports'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(404)
  })
})

describe('GET /api/portal/campaigns/[id]/analytics', () => {
  it('returns analytics payload from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(getPortalCampaignAnalytics).mockResolvedValue({
      ok: true,
      data: {
        campaign: { id: 'camp-1', name: 'Pilot', status: 'active' },
        analytics: {
          totals: {
            invitations: 4,
            sent: 3,
            opened: 2,
            started: 1,
            completed: 1,
            submissions: 1,
          },
          rates: { open_rate: 66.7, start_rate: 50, completion_rate: 25 },
          scores: { average: 3.5, sample_size: 1 },
        },
      },
    })

    const res = await getCampaignAnalytics(new Request('http://localhost/api/portal/campaigns/camp-1/analytics'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.analytics.scores.average).toBe(3.5)
  })

  it('maps internal errors to 500', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(getPortalCampaignAnalytics).mockResolvedValue({
      ok: false,
      error: 'internal_error',
      message: 'Failed to load campaign analytics.',
    })

    const res = await getCampaignAnalytics(new Request('http://localhost/api/portal/campaigns/camp-1/analytics'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(500)
  })
})

describe('GET /api/portal/campaigns/[id]/responses', () => {
  it('returns responses payload from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listPortalCampaignResponses).mockResolvedValue({
      ok: true,
      data: {
        responses: [
          {
            id: 'sub-1',
            assessment_id: 'assess-1',
            status: 'completed',
            score: 3.5,
            classification_label: 'Leader',
            created_at: '2026-01-01T00:00:00Z',
            completed_at: '2026-01-01T00:00:00Z',
            demographics: null,
            assessments: { id: 'assess-1', key: 'ai', name: 'AI' },
            assessment_invitations: {
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
              organisation: 'Org',
              role: 'Lead',
            },
          },
        ],
      },
    })

    const res = await getCampaignResponses(new Request('http://localhost/api/portal/campaigns/camp-1/responses'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.responses[0].id).toBe('sub-1')
    expect(body.responses[0].score).toBe(3.5)
  })

  it('maps not found errors to 404', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listPortalCampaignResponses).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await getCampaignResponses(new Request('http://localhost/api/portal/campaigns/camp-1/responses'), {
      params: Promise.resolve({ id: 'camp-1' }),
    })

    expect(res.status).toBe(404)
  })
})
