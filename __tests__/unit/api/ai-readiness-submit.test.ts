import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/security/origin', () => ({ assertSameOrigin: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/ai-readiness-survey', () => ({
  submitAiReadinessOrientationSurvey: vi.fn(),
}))

import { POST } from '@/app/api/assessments/ai-readiness/submit/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { assertSameOrigin } from '@/utils/security/origin'
import { submitAiReadinessOrientationSurvey } from '@/utils/services/ai-readiness-survey'

const allowedRateLimit = { allowed: true, limit: 10, remaining: 9, reset: 0 }

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/assessments/ai-readiness/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'user-agent': 'vitest',
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
  vi.mocked(assertSameOrigin).mockResolvedValue(undefined)
})

describe('POST /api/assessments/ai-readiness/submit', () => {
  it('returns 403 for invalid origin', async () => {
    vi.mocked(assertSameOrigin).mockRejectedValue(new Error('bad origin'))

    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('invalid_origin')
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await POST(makeRequest({}))

    expect(res.status).toBe(429)
  })

  it('delegates to the service and returns success payload', async () => {
    vi.mocked(submitAiReadinessOrientationSurvey).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        reportPath: '/framework/lq-ai-readiness/orientation-survey/report',
        reportAccessToken: 'tok-123',
        result: {
          openness: 4,
          riskPosture: 3.5,
          capability: 4.2,
          opennessBand: 'Early Adopter',
          riskPostureBand: 'Moderate Awareness',
          capabilityBand: 'Confident & Skilled',
          overallLabel: 'AI-Ready Operator',
          recommendations: ['Do the thing'],
          reverseCodedItems: ['q4', 'q10', 'q16'],
        },
      },
    })

    const res = await POST(
      makeRequest({
        firstName: 'Ada',
        lastName: 'Lovelace',
        workEmail: 'ada@example.com',
        organisation: 'Analytical Engines',
        role: 'Lead',
        consent: true,
        responses: { q1: 4 },
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.submissionId).toBe('sub-1')
    expect(submitAiReadinessOrientationSurvey).toHaveBeenCalledWith({
      payload: expect.objectContaining({ firstName: 'Ada' }),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })
  })

  it('maps validation errors to 400', async () => {
    vi.mocked(submitAiReadinessOrientationSurvey).mockResolvedValue({
      ok: false,
      error: 'invalid_fields',
    })

    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('invalid_fields')
  })

  it('maps service failures to 500 and preserves message', async () => {
    vi.mocked(submitAiReadinessOrientationSurvey).mockResolvedValue({
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    })

    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    })
  })
})
