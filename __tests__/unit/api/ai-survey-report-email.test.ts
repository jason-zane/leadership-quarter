import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/ai-survey-report-email', () => ({
  resolveAiSurveyReportEmailAccess: vi.fn(),
  queueAiSurveyReportEmail: vi.fn(),
}))

import { POST } from '@/app/api/reports/ai_survey/email/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  queueAiSurveyReportEmail,
  resolveAiSurveyReportEmailAccess,
} from '@/utils/services/ai-survey-report-email'

const allowedRateLimit = { allowed: true, limit: 10, remaining: 9, reset: 0 }

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/reports/ai_survey/email', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/reports/ai_survey/email', () => {
  it('returns invalid_access when the token is invalid', async () => {
    vi.mocked(resolveAiSurveyReportEmailAccess).mockReturnValue({
      ok: false,
      error: 'invalid_access',
      message: 'This report link is no longer valid.',
    })

    const res = await POST(makeRequest({ access: 'bad-token' }))

    expect(res.status).toBe(403)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(resolveAiSurveyReportEmailAccess).mockReturnValue({
      ok: true,
      submissionId: 'sub-1',
    })
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await POST(makeRequest({ access: 'good-token' }))

    expect(res.status).toBe(429)
  })

  it('returns queued message on success', async () => {
    vi.mocked(resolveAiSurveyReportEmailAccess).mockReturnValue({
      ok: true,
      submissionId: 'sub-1',
    })
    vi.mocked(queueAiSurveyReportEmail).mockResolvedValue({
      ok: true,
      data: { message: 'Report link email queued for ada@example.com.' },
    })

    const res = await POST(makeRequest({ access: 'good-token' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('ada@example.com')
  })
})
