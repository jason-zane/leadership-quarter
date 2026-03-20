import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { getRuntimePublicAssessment } from '@/utils/services/assessment-runtime-public'
import { createAdminClient } from '@/utils/supabase/admin'

function makeAdminClientMock(options?: {
  assessment?: unknown
}) {
  const assessmentQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.assessment ?? null,
      error: null,
    }),
  }

  const reportsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'assessments') return assessmentQuery
      if (table === 'v2_assessment_reports') return reportsQuery
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getRuntimePublicAssessment', () => {
  it('returns a configuration error when the admin client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await getRuntimePublicAssessment({ assessmentKey: 'ai-readiness' })

    expect(result).toEqual({ ok: false, error: 'missing_service_role' })
  })

  it('returns assessment_not_found when the assessment is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)

    const result = await getRuntimePublicAssessment({ assessmentKey: 'ai-readiness' })

    expect(result).toEqual({ ok: false, error: 'assessment_not_found' })
  })

  it('returns questions_load_failed when question lookup fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        assessment: {
          id: 'assess-1',
          key: 'ai-readiness',
          name: 'AI Readiness',
          description: null,
          status: 'active',
          is_public: true,
          version: 2,
          runner_config: { estimated_minutes: 12 },
          report_config: { title: 'AI Readiness report' },
        },
      }) as never
    )

    const result = await getRuntimePublicAssessment({ assessmentKey: 'ai-readiness' })

    expect(result).toEqual({ ok: false, error: 'questions_load_failed' })
  })

  it('returns the runtime public payload with normalized configs', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        assessment: {
          id: 'assess-1',
          key: 'ai-readiness',
          name: 'AI Readiness',
          description: null,
          status: 'active',
          is_public: true,
          version: 2,
          runner_config: { estimated_minutes: 12 },
          report_config: { title: 'AI Readiness report' },
          v2_question_bank: {
            version: 1,
            traits: [{ id: 'trait-1', key: 'openness', externalName: 'openness', internalName: '', definition: '', competencyKeys: [] }],
            scoredItems: [{ id: 'q1', key: 'q1', text: 'Question 1', traitKey: 'openness', isReverseCoded: false, weight: 1 }],
            dimensions: [],
            competencies: [],
            socialItems: [],
            scale: { points: 5, labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'], order: 'ascending' },
          },
        },
      }) as never
    )

    const result = await getRuntimePublicAssessment({ assessmentKey: 'ai-readiness' })

    expect(result).toEqual({
      ok: true,
      data: {
        context: 'public',
        assessment: {
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
        runnerConfig: expect.objectContaining({
          estimated_minutes: 12,
        }),
        reportConfig: expect.objectContaining({
          title: 'AI Readiness report',
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
