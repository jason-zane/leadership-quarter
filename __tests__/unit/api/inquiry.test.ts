import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/security/origin', () => ({ assertSameOrigin: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/inquiry', () => ({
  submitInquiry: vi.fn(),
}))

import { POST } from '@/app/api/inquiry/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { assertSameOrigin } from '@/utils/security/origin'
import { submitInquiry } from '@/utils/services/inquiry'

const allowedRateLimit = { allowed: true, limit: 10, remaining: 9, reset: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(assertSameOrigin).mockResolvedValue(undefined)
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/inquiry', () => {
  it('returns 403 when the origin check fails', async () => {
    vi.mocked(assertSameOrigin).mockRejectedValue(new Error('invalid origin'))

    const res = await POST(new Request('http://localhost/api/inquiry', { method: 'POST' }))

    expect(res.status).toBe(403)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await POST(new Request('http://localhost/api/inquiry', { method: 'POST' }))

    expect(res.status).toBe(429)
  })

  it('maps invalid field errors to 400', async () => {
    vi.mocked(submitInquiry).mockResolvedValue({
      ok: false,
      error: 'invalid_fields',
    })

    const res = await POST(
      new Request('http://localhost/api/inquiry', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(res.status).toBe(400)
  })

  it('returns the submission id on success', async () => {
    vi.mocked(submitInquiry).mockResolvedValue({
      ok: true,
      data: { submissionId: 'sub-1' },
    })

    const res = await POST(
      new Request('http://localhost/api/inquiry', {
        method: 'POST',
        body: JSON.stringify({ name: 'Ada' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.submissionId).toBe('sub-1')
  })
})
