import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/assessments/api-auth', () => ({ requireDashboardApiAuth: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/email-templates', () => ({ getRuntimeEmailTemplates: vi.fn() }))
vi.mock('@/utils/assessments/email', () => ({ sendSurveyInvitationEmail: vi.fn() }))

import { POST as postAdminEmailTestSend } from '@/app/api/admin/email/test-send/route'
import { POST as postAdminInvitationSend } from '@/app/api/admin/invitations/[id]/send/route'
import { POST as postAssessmentInvitations } from '@/app/api/admin/assessments/[id]/invitations/route'
import { POST as postCohortInvitations } from '@/app/api/admin/assessments/[id]/cohorts/[cohortId]/invitations/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

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
    allowed: false,
    limit: 5,
    remaining: 0,
    reset: Date.now() + 30_000,
    retryAfterSeconds: 30,
  })
})

describe('authenticated expensive route limits', () => {
  it('returns 429 for admin test email sends', async () => {
    const res = await postAdminEmailTestSend(new Request('http://localhost/api/admin/email/test-send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateKey: 'inquiry_user_confirmation' }),
    }) as never)

    expect(res.status).toBe(429)
  })

  it('returns 429 for admin invitation resend', async () => {
    const res = await postAdminInvitationSend(
      new Request('http://localhost/api/admin/invitations/inv-1/send', { method: 'POST' }),
      { params: Promise.resolve({ id: 'inv-1' }) }
    )

    expect(res.status).toBe(429)
  })

  it('returns 429 for assessment invitation batches', async () => {
    const res = await postAssessmentInvitations(
      new Request('http://localhost/api/admin/assessments/assess-1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invitations: [{ email: 'ada@example.com' }] }),
      }),
      { params: Promise.resolve({ id: 'assess-1' }) }
    )

    expect(res.status).toBe(429)
  })

  it('returns 429 for cohort invitation batches', async () => {
    const res = await postCohortInvitations(
      new Request('http://localhost/api/admin/assessments/assess-1/cohorts/cohort-1/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invitations: [{ email: 'ada@example.com' }] }),
      }),
      { params: Promise.resolve({ id: 'assess-1', cohortId: 'cohort-1' }) }
    )

    expect(res.status).toBe(429)
  })

  it('returns auth failures unchanged', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }),
    } as never)

    const res = await postAdminInvitationSend(
      new Request('http://localhost/api/admin/invitations/inv-1/send', { method: 'POST' }),
      { params: Promise.resolve({ id: 'inv-1' }) }
    )

    expect(res.status).toBe(403)
  })
})
