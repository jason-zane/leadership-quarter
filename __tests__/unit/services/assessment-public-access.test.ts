import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { getPublicAssessment } from '@/utils/services/assessment-public-access'
import { createAdminClient } from '@/utils/supabase/admin'

function makeAdminClientMock(options?: {
  assessment?: unknown
  questions?: unknown[]
  questionError?: unknown
}) {
  const assessmentQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.assessment ?? null,
      error: null,
    }),
  }
  assessmentQuery.eq.mockReturnValueOnce(assessmentQuery).mockReturnValueOnce(assessmentQuery)

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
      if (table === 'assessments') return assessmentQuery
      if (table === 'assessment_questions') return questionsQuery
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPublicAssessment', () => {
  it('returns a configuration error when the admin client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await getPublicAssessment({ assessmentKey: 'ai-readiness' })

    expect(result).toEqual({
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    })
  })

  it('returns survey_not_found when the public survey is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)

    const result = await getPublicAssessment({ assessmentKey: 'ai-readiness' })

    expect(result).toEqual({ ok: false, error: 'survey_not_found' })
  })

  it('returns questions_load_failed when question lookup fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        assessment: {
          id: 'assess-1',
          key: 'ai-readiness',
          name: 'AI Readiness',
          description: null,
          version: 2,
          status: 'active',
          is_public: true,
        },
        questionError: { message: 'boom' },
      }) as never
    )

    const result = await getPublicAssessment({ assessmentKey: 'ai-readiness' })

    expect(result).toEqual({ ok: false, error: 'questions_load_failed' })
  })

  it('returns the public assessment payload with the survey alias', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        assessment: {
          id: 'assess-1',
          key: 'ai-readiness',
          name: 'AI Readiness',
          description: null,
          version: 2,
          status: 'active',
          is_public: true,
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
      }) as never
    )

    const result = await getPublicAssessment({ assessmentKey: 'ai-readiness' })

    expect(result).toEqual({
      ok: true,
      data: {
        assessment: {
          id: 'assess-1',
          key: 'ai-readiness',
          name: 'AI Readiness',
          description: null,
          version: 2,
        },
        survey: {
          id: 'assess-1',
          key: 'ai-readiness',
          name: 'AI Readiness',
          description: null,
          version: 2,
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
      },
    })
  })
})
