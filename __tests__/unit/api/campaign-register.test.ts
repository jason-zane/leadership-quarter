import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/assessment-campaign-entry', () => ({
  registerAssessmentCampaignParticipant: vi.fn(),
}))

import { POST } from '@/app/api/assessments/campaigns/[slug]/register/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { registerAssessmentCampaignParticipant } from '@/utils/services/assessment-campaign-entry'

const allowedRateLimit = { allowed: true, limit: 20, remaining: 19, reset: 0 }

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/assessments/campaigns/pilot/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const params = Promise.resolve({ slug: 'pilot' })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/assessments/campaigns/[slug]/register', () => {
  it('returns success with token and survey path', async () => {
    vi.mocked(registerAssessmentCampaignParticipant).mockResolvedValue({
      ok: true,
      data: { token: 'tok-1', surveyPath: '/assess/i/tok-1' },
    })

    const res = await POST(
      makeRequest({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      }),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, token: 'tok-1', surveyPath: '/assess/i/tok-1' })
  })

  it('maps validation errors to 400', async () => {
    vi.mocked(registerAssessmentCampaignParticipant).mockResolvedValue({
      ok: false,
      error: 'invalid_fields',
    })

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(400)
  })

  it('maps campaign not found to 404', async () => {
    vi.mocked(registerAssessmentCampaignParticipant).mockResolvedValue({
      ok: false,
      error: 'campaign_not_found',
    })

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(404)
  })

  it('maps inactive campaign or survey to 410', async () => {
    vi.mocked(registerAssessmentCampaignParticipant).mockResolvedValue({
      ok: false,
      error: 'survey_not_active',
    })

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(410)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(429)
  })
})
