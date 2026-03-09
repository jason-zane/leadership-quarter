import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/logger', () => ({ logRequest: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/assessment-campaign-entry', () => ({
  submitAssessmentCampaign: vi.fn(),
}))

import { POST } from '@/app/api/assessments/campaigns/[slug]/submit/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { submitAssessmentCampaign } from '@/utils/services/assessment-campaign-entry'

const allowedRateLimit = { allowed: true, limit: 20, remaining: 19, reset: 0 }
const params = Promise.resolve({ slug: 'pilot' })

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/assessments/campaigns/pilot/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/assessments/campaigns/[slug]/submit', () => {
  it('returns report access payload on success', async () => {
    vi.mocked(submitAssessmentCampaign).mockResolvedValue({
      ok: true,
      assessmentId: 'assess-1',
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

  it('returns contact gate payload when gated', async () => {
    vi.mocked(submitAssessmentCampaign).mockResolvedValue({
      ok: true,
      assessmentId: 'assess-1',
      data: {
        nextStep: 'contact_gate',
        gatePath: '/assess/contact?gate=tok',
      },
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.nextStep).toBe('contact_gate')
  })

  it('maps invalid payloads to 400', async () => {
    vi.mocked(submitAssessmentCampaign).mockResolvedValue({
      ok: false,
      error: 'invalid_payload',
    })

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(400)
  })

  it('maps missing campaign to 404', async () => {
    vi.mocked(submitAssessmentCampaign).mockResolvedValue({
      ok: false,
      error: 'campaign_not_found',
    })

    const res = await POST(makeRequest({}), { params })

    expect(res.status).toBe(404)
  })

  it('maps inactive campaign or assessment to 410', async () => {
    vi.mocked(submitAssessmentCampaign).mockResolvedValue({
      ok: false,
      error: 'assessment_not_active',
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

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })

    expect(res.status).toBe(429)
  })
})
