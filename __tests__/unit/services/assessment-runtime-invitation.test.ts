import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { getRuntimeInvitationAssessment } from '@/utils/services/assessment-runtime-invitation'
import { createAdminClient } from '@/utils/supabase/admin'

function makeAdminClientMock(options?: {
  invitation?: unknown
  questions?: unknown[]
  questionError?: unknown
}) {
  const invitationQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.invitation ?? null,
      error: null,
    }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  }
  const questionsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.questions ?? [],
      error: options?.questionError ?? null,
    }),
  }
  questionsQuery.eq.mockReturnValueOnce(questionsQuery).mockReturnValueOnce(questionsQuery)

  return {
    from: vi.fn((table: string) => {
      if (table === 'assessment_invitations') return invitationQuery
      if (table === 'assessment_questions') return questionsQuery
      return {}
    }),
  }
}

function makeInvitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    token: 'tok123',
    status: 'pending',
    expires_at: null,
    first_name: 'Ada',
    last_name: 'Lovelace',
    organisation: 'Analytical Engines',
    role: 'Lead',
    assessments: {
      id: 'assess-1',
      key: 'ai',
      name: 'AI Readiness',
      description: null,
      status: 'active',
      version: 2,
      runner_config: { estimated_minutes: 10 },
      report_config: { title: 'AI report' },
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getRuntimeInvitationAssessment', () => {
  it('returns a configuration error when the admin client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await getRuntimeInvitationAssessment({ token: 'tok123' })

    expect(result).toEqual({ ok: false, error: 'missing_service_role' })
  })

  it('returns invitation_completed for completed invitations', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow({ status: 'completed' }),
      }) as never
    )

    const result = await getRuntimeInvitationAssessment({ token: 'tok123' })

    expect(result).toEqual({ ok: false, error: 'invitation_completed' })
  })

  it('returns invitation_expired for stale invitations', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow({
          expires_at: new Date(Date.now() - 10_000).toISOString(),
        }),
      }) as never
    )

    const result = await getRuntimeInvitationAssessment({ token: 'tok123' })

    expect(result).toEqual({ ok: false, error: 'invitation_expired' })
  })

  it('returns assessment_not_active when the invitation assessment is inactive', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow({
          assessments: {
            id: 'assess-1',
            key: 'ai',
            name: 'AI Readiness',
            description: null,
            status: 'inactive',
            version: 2,
            runner_config: {},
            report_config: {},
          },
        }),
      }) as never
    )

    const result = await getRuntimeInvitationAssessment({ token: 'tok123' })

    expect(result).toEqual({ ok: false, error: 'assessment_not_active' })
  })

  it('returns the runtime invitation payload with normalized configs', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow(),
        questions: [
          {
            id: 'q1',
            question_key: 'q1',
            text: 'Question 1',
            dimension: 'openness',
            is_reverse_coded: false,
            sort_order: 1,
          },
        ],
      }) as never
    )

    const result = await getRuntimeInvitationAssessment({ token: 'tok123' })

    expect(result).toEqual({
      ok: true,
      data: {
        context: 'invitation',
        assessment: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          version: 2,
        },
        invitation: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          organisation: 'Analytical Engines',
          role: 'Lead',
        },
        questions: [
          {
            id: 'q1',
            question_key: 'q1',
            text: 'Question 1',
            dimension: 'openness',
            is_reverse_coded: false,
            sort_order: 1,
          },
        ],
        runnerConfig: expect.objectContaining({
          estimated_minutes: 10,
        }),
        reportConfig: expect.objectContaining({
          title: 'AI report',
        }),
        v2ExperienceConfig: expect.objectContaining({
          schemaVersion: 1,
        }),
        scale: {
          points: 5,
          labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
        },
      },
    })
  })
})
