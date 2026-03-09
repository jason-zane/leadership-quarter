import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { getAssessmentRuntimeCampaign } from '@/utils/services/assessment-runtime-campaign'
import { createAdminClient } from '@/utils/supabase/admin'

function makeCampaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'camp-1',
    name: 'Pilot',
    slug: 'pilot',
    status: 'active',
    config: {
      registration_position: 'before',
      report_access: 'immediate',
      demographics_enabled: false,
      demographics_fields: [],
    },
    runner_overrides: { progress_style: 'steps' },
    organisations: { name: 'Analytical Engines' },
    campaign_assessments: [
      {
        id: 'ca-1',
        assessment_id: 'assess-1',
        sort_order: 0,
        is_active: true,
        assessments: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          status: 'active',
          version: 3,
          runner_config: {
            estimated_minutes: 12,
          },
          report_config: {
            title: 'AI Readiness report',
          },
        },
      },
    ],
    ...overrides,
  }
}

function makeAdminClientMock(options?: {
  campaign?: unknown
  questions?: unknown[]
  questionError?: unknown
}) {
  const campaignQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.campaign ?? null,
      error: null,
    }),
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
      if (table === 'campaigns') return campaignQuery
      if (table === 'assessment_questions') return questionsQuery
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAssessmentRuntimeCampaign', () => {
  it('returns a configuration error when the admin client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await getAssessmentRuntimeCampaign({ slug: 'pilot' })

    expect(result).toEqual({ ok: false, error: 'missing_service_role' })
  })

  it('returns assessment_not_active when the primary assessment is inactive', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        campaign: makeCampaignRow({
          campaign_assessments: [
            {
              id: 'ca-1',
              assessment_id: 'assess-1',
              sort_order: 0,
              is_active: true,
              assessments: {
                id: 'assess-1',
                key: 'ai',
                name: 'AI Readiness',
                description: null,
                status: 'inactive',
                version: 3,
                runner_config: {},
                report_config: {},
              },
            },
          ],
        }),
      }) as never
    )

    const result = await getAssessmentRuntimeCampaign({ slug: 'pilot' })

    expect(result).toEqual({ ok: false, error: 'assessment_not_active' })
  })

  it('returns questions_load_failed when question lookup fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        campaign: makeCampaignRow(),
        questionError: { message: 'boom' },
      }) as never
    )

    const result = await getAssessmentRuntimeCampaign({ slug: 'pilot' })

    expect(result).toEqual({ ok: false, error: 'questions_load_failed' })
  })

  it('returns the runtime campaign payload with normalized configs', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        campaign: makeCampaignRow(),
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

    const result = await getAssessmentRuntimeCampaign({ slug: 'pilot' })

    expect(result).toEqual({
      ok: true,
      data: {
        context: 'campaign',
        campaign: {
          id: 'camp-1',
          slug: 'pilot',
          name: 'Pilot',
          organisation: 'Analytical Engines',
          config: {
            registration_position: 'before',
            report_access: 'immediate',
            demographics_enabled: false,
            demographics_fields: [],
          },
        },
        assessment: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          version: 3,
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
          title: 'Pilot',
          progress_style: 'steps',
          estimated_minutes: 12,
        }),
        reportConfig: expect.objectContaining({
          title: 'AI Readiness report',
        }),
      },
    })
  })
})
