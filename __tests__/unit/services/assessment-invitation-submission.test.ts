import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/assessments/submission-pipeline', () => ({ submitAssessment: vi.fn() }))
vi.mock('@/utils/security/report-access', () => ({
  hasReportAccessTokenSecret: vi.fn().mockReturnValue(true),
  createReportAccessToken: vi.fn().mockReturnValue('report-tok-123'),
}))
vi.mock('@/utils/hosts', () => ({ getPortalBaseUrl: vi.fn().mockReturnValue('https://app.example.com') }))

import { submitAssessmentInvitation } from '@/utils/services/assessment-invitation-submission'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import {
  createReportAccessToken,
  hasReportAccessTokenSecret,
} from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'

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
    demographics: null,
    status: 'pending',
    started_at: null,
    completed_at: null,
    expires_at: null,
    assessments: { id: 'assess-1', key: 'test', name: 'Test Assessment', status: 'active' },
    ...overrides,
  }
}

function makeAdminClientMock(options?: {
  invitation?: unknown
  existingSubmission?: unknown
  emailJobError?: unknown
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'assessment_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: options?.invitation ?? null, error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'assessment_submissions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: options?.existingSubmission ?? null,
            error: null,
          }),
        }
      }
      if (table === 'email_jobs') {
        return {
          insert: vi.fn().mockResolvedValue({ error: options?.emailJobError ?? null }),
        }
      }
      if (table === 'v2_assessment_reports') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [{ id: 'report-1' }], error: null }),
        }
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(hasReportAccessTokenSecret).mockReturnValue(true)
  vi.mocked(createReportAccessToken).mockReturnValue('report-tok-123')
})

describe('submitAssessmentInvitation', () => {
  it('returns a configuration error when the service role client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await submitAssessmentInvitation({
      token: 'tok123',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    })
  })

  it('rejects invalid payloads', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)

    const result = await submitAssessmentInvitation({
      token: 'tok123',
      payload: { wrong: 'data' },
    })

    expect(result).toEqual({
      ok: false,
      error: 'invalid_payload',
    })
  })

  it('expires stale invitations and returns invitation_expired', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow({
          expires_at: new Date(Date.now() - 10_000).toISOString(),
        }),
      }) as never
    )

    const result = await submitAssessmentInvitation({
      token: 'tok123',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: false,
      error: 'invitation_expired',
      invitationId: 'inv-1',
      assessmentId: 'assess-1',
    })
  })

  it('returns the existing report token for completed invitations', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
        existingSubmission: {
          id: 'sub-1',
          report_access_token: 'existing-report-token',
        },
      }) as never
    )

    const result = await submitAssessmentInvitation({
      token: 'tok123',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: true,
      invitationId: 'inv-1',
      assessmentId: 'assess-1',
      data: {
        submissionId: 'sub-1',
        reportAccessToken: 'existing-report-token',
        reportPath: '/assess/r/assessment',
      },
    })
    expect(submitAssessment).not.toHaveBeenCalled()
  })

  it('returns invitation_completed when a completed invitation has no stored report token', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      }) as never
    )

    const result = await submitAssessmentInvitation({
      token: 'tok123',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: false,
      error: 'invitation_completed',
      invitationId: 'inv-1',
      assessmentId: 'assess-1',
    })
  })

  it('propagates pipeline validation failures', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({ invitation: makeInvitationRow() }) as never
    )
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: false,
      error: 'invalid_responses',
    })

    const result = await submitAssessmentInvitation({
      token: 'tok123',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: false,
      error: 'invalid_responses',
      invitationId: 'inv-1',
      assessmentId: 'assess-1',
    })
  })

  it('returns the fresh submission payload and queues the completion email job', async () => {
    const adminClient = makeAdminClientMock({
      invitation: makeInvitationRow({
        demographics: {
          job_level: 'director',
          ethnicity_race: ['asian'],
        },
      }),
    })
    vi.mocked(createAdminClient).mockReturnValue(adminClient as never)
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-99',
        assessment: { id: 'assess-1', key: 'test', name: 'Test Assessment' },
        normalizedResponses: {},
        scores: { dim1: 4 },
        bands: { dim1: 'high' },
        classification: { key: 'leader', label: 'Leader' },
        recommendations: ['Keep going'],
      },
    })

    const result = await submitAssessmentInvitation({
      token: 'tok123',
      payload: { responses: { q1: 4, q2: 3 } },
    })

    expect(result).toEqual({
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
        recommendations: ['Keep going'],
      },
    })
    expect(submitAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: 'assess-1',
        invitation: expect.objectContaining({
          id: 'inv-1',
          email: 'test@example.com',
        }),
        demographics: {
          job_level: 'director',
          ethnicity_race: ['asian'],
        },
      })
    )
  })
})
