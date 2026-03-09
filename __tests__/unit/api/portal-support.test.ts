import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/security/origin', () => ({ assertSameOrigin: vi.fn() }))
vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/portal-support', () => ({
  submitPortalSupportRequest: vi.fn(),
}))

import { NextResponse } from 'next/server'
import { POST } from '@/app/api/portal/support/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { assertSameOrigin } from '@/utils/security/origin'
import { submitPortalSupportRequest } from '@/utils/services/portal-support'

const allowedRateLimit = { allowed: true, limit: 10, remaining: 9, reset: 0 }

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

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/portal/support', {
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
  vi.mocked(assertSameOrigin).mockResolvedValue(undefined)
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/portal/support', () => {
  it('returns 403 for invalid origin', async () => {
    vi.mocked(assertSameOrigin).mockRejectedValue(new Error('bad origin'))

    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('invalid_origin')
  })

  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(401, 'unauthorized') as never)

    const res = await POST(makeRequest({}))

    expect(res.status).toBe(401)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const res = await POST(makeRequest({ topic: 'Need help', message: 'Details' }))

    expect(res.status).toBe(429)
  })

  it('delegates to the service and returns success payload', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(submitPortalSupportRequest).mockResolvedValue({
      ok: true,
      data: { requestId: 'req-1' },
    })

    const res = await POST(makeRequest({ topic: 'Need help', message: 'Details', campaign_id: 'camp-1' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, requestId: 'req-1' })
    expect(submitPortalSupportRequest).toHaveBeenCalledWith({
      adminClient: {},
      organisationId: 'org-1',
      organisationSlug: 'acme',
      userId: 'user-1',
      userEmail: 'user@example.com',
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
      payload: {
        topic: 'Need help',
        message: 'Details',
        campaign_id: 'camp-1',
      },
    })
  })

  it('maps validation errors to 400', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(submitPortalSupportRequest).mockResolvedValue({
      ok: false,
      error: 'invalid_topic',
      message: 'Topic is required and must be 120 characters or fewer.',
    })

    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('invalid_topic')
  })

  it('maps configuration errors to 500', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(submitPortalSupportRequest).mockResolvedValue({
      ok: false,
      error: 'support_email_not_configured',
      message: 'Support email recipient is not configured. Please contact an administrator.',
    })

    const res = await POST(makeRequest({}))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('support_email_not_configured')
  })
})
