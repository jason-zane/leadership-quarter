import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/logger', () => ({ logRequest: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/assessment-invitation-submission', () => ({
  submitAssessmentInvitation: vi.fn(),
}))

import { POST } from '@/app/api/assessments/invitation/[token]/submit/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { submitAssessmentInvitation } from '@/utils/services/assessment-invitation-submission'

const allowedRateLimit = { allowed: true, limit: 5, remaining: 4, reset: 0 }
const params = Promise.resolve({ token: 'tok123' })

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/assessments/invitation/tok123/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/assessments/invitation/[token]/submit', () => {
  it('valid token + responses → 200 with report token', async () => {
    vi.mocked(submitAssessmentInvitation).mockResolvedValue({
      ok: true,
      invitationId: 'inv-1',
      assessmentId: 'assess-1',
      data: {
        submissionId: 'sub-99',
        reportAccessToken: 'report-tok-123',
        reportPath: '/assess/r/assessment',
        scores: { dim1: 4 },
        bands: { dim1: 'high' },
        classification: { key: 'leader', label: 'Leader' },
        recommendations: [],
      },
    })

    const res = await POST(makeRequest({ responses: { q1: 4, q2: 3 } }), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.reportAccessToken).toBe('report-tok-123')
    expect(body.submissionId).toBe('sub-99')
  })

  it('invitation not found → 404', async () => {
    vi.mocked(submitAssessmentInvitation).mockResolvedValue({
      ok: false,
      error: 'invitation_not_found',
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })

    expect(res.status).toBe(404)
  })

  it('expired token → 410 invitation_expired', async () => {
    vi.mocked(submitAssessmentInvitation).mockResolvedValue({
      ok: false,
      error: 'invitation_expired',
      invitationId: 'inv-1',
      assessmentId: 'assess-1',
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })
    const body = await res.json()

    expect(res.status).toBe(410)
    expect(body.error).toBe('invitation_expired')
  })

  it('already completed → 410 invitation_completed', async () => {
    vi.mocked(submitAssessmentInvitation).mockResolvedValue({
      ok: false,
      error: 'invitation_completed',
      invitationId: 'inv-1',
      assessmentId: 'assess-1',
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })
    const body = await res.json()

    expect(res.status).toBe(410)
    expect(body.error).toBe('invitation_completed')
  })

  it('assessment not active → 410', async () => {
    vi.mocked(submitAssessmentInvitation).mockResolvedValue({
      ok: false,
      error: 'survey_not_active',
      invitationId: 'inv-1',
      assessmentId: 'assess-1',
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })

    expect(res.status).toBe(410)
  })

  it('invalid payload → 400', async () => {
    vi.mocked(submitAssessmentInvitation).mockResolvedValue({
      ok: false,
      error: 'invalid_payload',
    })

    const res = await POST(makeRequest({ wrong: 'data' }), { params })

    expect(res.status).toBe(400)
  })

  it('rate limited → 429', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await POST(makeRequest({ responses: { q1: 3 } }), { params })

    expect(res.status).toBe(429)
  })
})
