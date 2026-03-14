import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/assessments/submission-pipeline', () => ({ submitAssessment: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/report-access', () => ({
  hasGateAccessTokenSecret: vi.fn().mockReturnValue(true),
  hasReportAccessTokenSecret: vi.fn().mockReturnValue(true),
  createGateAccessToken: vi.fn().mockReturnValue('gate-tok'),
  createReportAccessToken: vi.fn().mockReturnValue('report-tok'),
}))
vi.mock('@/utils/logger', () => ({ logRequest: vi.fn(), logRateLimitEvent: vi.fn() }))

import { POST } from '@/app/api/assessments/campaigns/[slug]/submit/route'
import { createAdminClient } from '@/utils/supabase/admin'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { checkRateLimit } from '@/utils/assessments/rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const allowedRateLimit = { allowed: true, limit: 20, remaining: 19, reset: 0 }

function makeValidBody(responses: Record<string, number> = { q1: 3, q2: 4 }) {
  return JSON.stringify({ responses })
}

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/assessments/campaigns/test-slug/submit', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function makeActiveCampaign(assessmentStatus = 'active') {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    status: 'active',
    config: { report_access: 'open', registration_position: 'none' },
    campaign_assessments: [
      {
        id: 'ca-1',
        assessment_id: 'assess-1',
        sort_order: 0,
        is_active: true,
        assessments: { id: 'assess-1', key: 'test', name: 'Test', status: assessmentStatus },
      },
    ],
  }
}

function makeAdminClientMock(campaign: unknown) {
  const invitationsUpdate = { eq: vi.fn().mockResolvedValue({ error: null }) }
  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: campaign, error: null }),
        }
      }
      if (table === 'assessment_invitations') {
        return { update: vi.fn().mockReturnValue(invitationsUpdate) }
      }
      return {}
    }),
  }
}

const params = Promise.resolve({ slug: 'test-slug' })

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/assessments/campaigns/[slug]/submit', () => {
  it('valid submission → 200 with report token', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(makeActiveCampaign()) as never)
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        assessment: { id: 'a1', key: 'k', name: 'N' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    const req = makeRequest(makeValidBody())
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.reportAccessToken).toBe('report-tok')
  })

  it('inactive campaign assessment → 410', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock(makeActiveCampaign('inactive')) as never
    )

    const req = makeRequest(makeValidBody())
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(410)
    expect(body.error).toBe('assessment_not_active')
  })

  it('campaign not found → 404', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock(null) as never
    )

    const req = makeRequest(makeValidBody())
    const res = await POST(req, { params })

    expect(res.status).toBe(404)
  })

  it('inactive campaign → 410', async () => {
    const inactiveCampaign = { ...makeActiveCampaign(), status: 'draft' }
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock(inactiveCampaign) as never
    )

    const req = makeRequest(makeValidBody())
    const res = await POST(req, { params })

    expect(res.status).toBe(410)
  })

  it('invalid payload (missing responses) → 400', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock(makeActiveCampaign()) as never
    )

    const req = makeRequest(JSON.stringify({ something: 'else' }))
    const res = await POST(req, { params })

    expect(res.status).toBe(400)
  })

  it('rate limited → 429', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock(makeActiveCampaign()) as never
    )
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 30000,
      retryAfterSeconds: 30,
    })

    const req = makeRequest(makeValidBody())
    const res = await POST(req, { params })

    expect(res.status).toBe(429)
  })

  it('missing admin client → 500', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const req = makeRequest(makeValidBody())
    const res = await POST(req, { params })

    expect(res.status).toBe(500)
  })
})
