import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { getAssessmentInvitation } from '@/utils/services/assessment-invitation-access'
import { createAdminClient } from '@/utils/supabase/admin'

function makeInvitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    assessment_id: 'assess-1',
    token: 'tok123',
    first_name: 'Ada',
    last_name: 'Lovelace',
    organisation: 'Analytical Engines',
    role: 'Lead',
    status: 'pending',
    opened_at: null,
    completed_at: null,
    expires_at: null,
    assessments: {
      id: 'assess-1',
      key: 'ai',
      name: 'AI Readiness',
      description: null,
      version: 1,
      status: 'active',
    },
    ...overrides,
  }
}

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
  questionsQuery.eq
    .mockReturnValueOnce(questionsQuery)
    .mockReturnValueOnce(questionsQuery)

  return {
    from: vi.fn((table: string) => {
      if (table === 'assessment_invitations') return invitationQuery
      if (table === 'assessment_questions') return questionsQuery
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAssessmentInvitation', () => {
  it('returns a configuration error when the admin client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await getAssessmentInvitation({ token: 'tok123' })

    expect(result).toEqual({
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    })
  })

  it('returns invitation_expired for stale invitations', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow({
          expires_at: new Date(Date.now() - 10_000).toISOString(),
        }),
      }) as never
    )

    const result = await getAssessmentInvitation({ token: 'tok123' })

    expect(result).toEqual({ ok: false, error: 'invitation_expired' })
  })

  it('returns invitation_completed for completed invitations', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        invitation: makeInvitationRow({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }),
      }) as never
    )

    const result = await getAssessmentInvitation({ token: 'tok123' })

    expect(result).toEqual({ ok: false, error: 'invitation_completed' })
  })

  it('returns the assessment, questions, and invitation payload', async () => {
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

    const result = await getAssessmentInvitation({ token: 'tok123' })

    expect(result).toEqual({
      ok: true,
      data: {
        assessment: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          version: 1,
        },
        survey: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          version: 1,
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
        invitation: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          organisation: 'Analytical Engines',
          role: 'Lead',
        },
      },
    })
  })
})
