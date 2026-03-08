import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/assessments/submission-pipeline', () => ({ submitAssessment: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/report-access', () => ({
  hasReportAccessTokenSecret: vi.fn().mockReturnValue(true),
  createReportAccessToken: vi.fn().mockReturnValue('report-tok-123'),
}))
vi.mock('@/utils/hosts', () => ({ getPortalBaseUrl: vi.fn().mockReturnValue('https://app.example.com') }))
vi.mock('@/utils/logger', () => ({ logRequest: vi.fn() }))

import { POST } from '@/app/api/assessments/invitation/[token]/submit/route'
import { createAdminClient } from '@/utils/supabase/admin'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { checkRateLimit } from '@/utils/assessments/rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const allowedRateLimit = { allowed: true, limit: 5, remaining: 4, reset: 0 }

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request('http://localhost/api/assessments/invitation/tok123/submit', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function makeInvitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    assessment_id: 'assess-1',
    token: 'tok123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    organisation: 'Acme',
    role: 'manager',
    contact_id: null,
    campaign_id: null,
    status: 'pending',
    started_at: null,
    completed_at: null,
    expires_at: null,
    assessments: { id: 'assess-1', key: 'test', name: 'Test Assessment', status: 'active' },
    ...overrides,
  }
}

function makeAdminClientMock(invitation: unknown, emailJobError: unknown = null) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'assessment_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: invitation, error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'assessment_submissions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'email_jobs') {
        return { insert: vi.fn().mockResolvedValue({ error: emailJobError }) }
      }
      return {}
    }),
  }
}

const params = Promise.resolve({ token: 'tok123' })

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('POST /api/assessments/invitation/[token]/submit', () => {
  it('valid token + responses → 200 with report token', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(makeInvitationRow()) as never)
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-99',
        assessment: { id: 'a1', key: 'k', name: 'N' },
        normalizedResponses: {},
        scores: { dim1: 4.0 },
        bands: { dim1: 'high' },
        classification: { key: 'leader', label: 'Leader' },
        recommendations: [],
      },
    })

    const req = makeRequest({ responses: { q1: 4, q2: 3 } })
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.reportAccessToken).toBe('report-tok-123')
    expect(body.submissionId).toBe('sub-99')
  })

  it('invitation not found → 404', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(null) as never)

    const req = makeRequest({ responses: { q1: 3 } })
    const res = await POST(req, { params })

    expect(res.status).toBe(404)
  })

  it('expired token → 410 invitation_expired', async () => {
    const expiredInv = makeInvitationRow({
      expires_at: new Date(Date.now() - 10_000).toISOString(),
    })
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(expiredInv) as never)

    const req = makeRequest({ responses: { q1: 3 } })
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(410)
    expect(body.error).toBe('invitation_expired')
  })

  it('already completed → 410 invitation_completed (no existing report token)', async () => {
    const completedInv = makeInvitationRow({ status: 'completed', completed_at: new Date().toISOString() })
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(completedInv) as never)

    const req = makeRequest({ responses: { q1: 3 } })
    const res = await POST(req, { params })
    const body = await res.json()

    expect(res.status).toBe(410)
    expect(body.error).toBe('invitation_completed')
  })

  it('assessment not active → 410', async () => {
    const inv = makeInvitationRow({
      assessments: { id: 'a1', key: 'k', name: 'N', status: 'inactive' },
    })
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(inv) as never)

    const req = makeRequest({ responses: { q1: 3 } })
    const res = await POST(req, { params })

    expect(res.status).toBe(410)
  })

  it('invalid payload → 400', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(makeInvitationRow()) as never)

    const req = makeRequest({ wrong: 'data' })
    const res = await POST(req, { params })

    expect(res.status).toBe(400)
  })

  it('rate limited → 429', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(makeInvitationRow()) as never)
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const req = makeRequest({ responses: { q1: 3 } })
    const res = await POST(req, { params })

    expect(res.status).toBe(429)
  })
})
