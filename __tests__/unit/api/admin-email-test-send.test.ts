import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/admin-email-test-send', () => ({
  sendAdminTestEmail: vi.fn(),
}))

import { POST } from '@/app/api/admin/email/test-send/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { sendAdminTestEmail } from '@/utils/services/admin-email-test-send'

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'admin-user' },
    role: 'admin' as const,
    adminClient: {},
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    limit: 5,
    remaining: 4,
    reset: 0,
  })
})

describe('POST /api/admin/email/test-send', () => {
  it('maps invalid payload errors to 400', async () => {
    vi.mocked(sendAdminTestEmail).mockResolvedValue({
      ok: false,
      error: 'template_key_required',
      status: 400,
    })

    const res = await POST(
      new Request('http://localhost/api/admin/email/test-send', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      }) as never
    )

    expect(res.status).toBe(400)
  })

  it('returns the message id on success', async () => {
    vi.mocked(sendAdminTestEmail).mockResolvedValue({
      ok: true,
      data: { messageId: 'msg-1' },
    })

    const res = await POST(
      new Request('http://localhost/api/admin/email/test-send', {
        method: 'POST',
        body: JSON.stringify({ templateKey: 'inquiry_user_confirmation' }),
        headers: { 'content-type': 'application/json' },
      }) as never
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.messageId).toBe('msg-1')
  })
})
