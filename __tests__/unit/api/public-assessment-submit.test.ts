import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/assessment-public-submission', () => ({
  submitPublicAssessment: vi.fn(),
}))

import { POST } from '@/app/api/assessments/public/[assessmentKey]/submit/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { submitPublicAssessment } from '@/utils/services/assessment-public-submission'

const allowedRateLimit = { allowed: true, limit: 20, remaining: 19, reset: 0 }
const params = Promise.resolve({ assessmentKey: 'ai-readiness' })

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/assessments/public/ai-readiness/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/assessments/public/[assessmentKey]/submit', () => {
  it('returns report access payload on success', async () => {
    vi.mocked(submitPublicAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        reportPath: '/assess/r/assessment',
        reportAccessToken: 'report-token',
      },
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.reportAccessToken).toBe('report-token')
  })

  it('maps invalid payloads to 400', async () => {
    vi.mocked(submitPublicAssessment).mockResolvedValue({
      ok: false,
      error: 'invalid_payload',
    })

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(400)
  })

  it('maps invalid responses to 400', async () => {
    vi.mocked(submitPublicAssessment).mockResolvedValue({
      ok: false,
      error: 'invalid_responses',
    })

    const res = await POST(makeRequest({ responses: { q1: 9 } }), { params })

    expect(res.status).toBe(400)
  })

  it('maps service failures to 500', async () => {
    vi.mocked(submitPublicAssessment).mockResolvedValue({
      ok: false,
      error: 'missing_report_secret',
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })

    expect(res.status).toBe(500)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })

    expect(res.status).toBe(429)
  })
})
