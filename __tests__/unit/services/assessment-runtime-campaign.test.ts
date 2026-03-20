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
      entry_limit: null,
    },
    runner_overrides: { progress_style: 'steps' },
    organisations: { name: 'Analytical Engines', slug: 'analytical-engines' },
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
  assessmentV2QuestionBank?: unknown
  includeQuestionBank?: boolean
  flowSteps?: unknown[]
}) {
  const organisationsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: 'org-1', name: 'Analytical Engines', slug: 'analytical-engines' },
      error: null,
    }),
  }
  const campaignQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.campaign ?? null,
      error: null,
    }),
  }

  const v2QuestionBank = options?.includeQuestionBank === false
    ? undefined
    : (options?.assessmentV2QuestionBank ?? {
        version: 1,
        traits: [{ id: 'trait-1', key: 'openness', externalName: 'openness', internalName: '', definition: '', competencyKeys: [] }],
        scoredItems: [{ id: 'q1', key: 'q1', text: 'Question 1', traitKey: 'openness', isReverseCoded: false, weight: 1 }],
        dimensions: [],
        competencies: [],
        socialItems: [],
        scale: { points: 5, labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'], order: 'ascending' },
      })

  const assessmentsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async function () {
      const idCalls = assessmentsQuery.eq.mock.calls.filter(([field]) => field === 'id')
      const assessmentId = idCalls[idCalls.length - 1]?.[1] ?? 'assess-1'
      return {
        data: {
          id: assessmentId,
          key: assessmentId === 'assess-2' ? 'leadership' : 'ai',
          name: assessmentId === 'assess-2' ? 'Leadership Quotient' : 'AI Readiness',
          description: null,
          status: 'active',
          version: 3,
          runner_config: { estimated_minutes: assessmentId === 'assess-2' ? 18 : 12 },
          report_config: { title: assessmentId === 'assess-2' ? 'Leadership report' : 'AI Readiness report' },
          v2_question_bank: v2QuestionBank,
        },
        error: null,
      }
    }),
  }
  const flowStepsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.flowSteps ?? [
        {
          id: 'step-1',
          campaign_id: 'camp-1',
          step_type: 'assessment',
          sort_order: 0,
          is_active: true,
          campaign_assessment_id: 'ca-1',
          screen_config: {},
          created_at: '',
          updated_at: '',
        },
      ],
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
      if (table === 'organisations') return organisationsQuery
      if (table === 'campaigns') return campaignQuery
      if (table === 'assessment_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }
      }
      if (table === 'assessment_submissions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }
      }
      if (table === 'assessments') return assessmentsQuery
      if (table === 'campaign_flow_steps') return flowStepsQuery
      if (table === 'v2_assessment_reports') return reportsQuery
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

    const result = await getAssessmentRuntimeCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

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

    const result = await getAssessmentRuntimeCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

    expect(result).toEqual({ ok: false, error: 'assessment_not_active' })
  })

  it('returns questions_load_failed when question lookup fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        campaign: makeCampaignRow(),
        includeQuestionBank: false,
      }) as never
    )

    const result = await getAssessmentRuntimeCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

    expect(result).toEqual({ ok: false, error: 'questions_load_failed' })
  })

  it('returns the runtime campaign payload with normalized configs', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        campaign: makeCampaignRow(),
      }) as never
    )

    const result = await getAssessmentRuntimeCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

    expect(result).toEqual({
      ok: true,
      data: {
        context: 'campaign',
        campaign: {
          id: 'camp-1',
          slug: 'pilot',
          organisationSlug: 'analytical-engines',
          name: 'Pilot',
          organisation: 'Analytical Engines',
          config: expect.objectContaining({
            registration_position: 'before',
            report_access: 'immediate',
            demographics_enabled: false,
            demographics_fields: [],
            demographics_position: 'before',
            entry_limit: null,
          }),
        },
        runnerConfig: expect.objectContaining({
          title: 'Pilot',
          progress_style: 'steps',
          estimated_minutes: 12,
        }),
        reportConfig: expect.objectContaining({
          title: 'AI Readiness report',
        }),
        v2ExperienceConfig: expect.objectContaining({
          schemaVersion: 1,
        }),
        assessmentSteps: [
          expect.objectContaining({
            campaignAssessmentId: 'ca-1',
            assessment: expect.objectContaining({
              id: 'assess-1',
              key: 'ai',
            }),
            questions: [
              expect.objectContaining({
                id: 'q1',
                question_key: 'q1',
              }),
            ],
          }),
        ],
        resolvedJourney: expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({ type: 'intro' }),
            expect.objectContaining({ type: 'assessment' }),
            expect.objectContaining({ type: 'completion' }),
          ]),
        }),
      },
    })
  })

  it('loads runtime bundles for multiple assessment steps', async () => {
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
                status: 'active',
                version: 3,
                runner_config: { estimated_minutes: 12 },
                report_config: { title: 'AI Readiness report' },
              },
            },
            {
              id: 'ca-2',
              assessment_id: 'assess-2',
              sort_order: 1,
              is_active: true,
              assessments: {
                id: 'assess-2',
                key: 'leadership',
                name: 'Leadership Quotient',
                description: null,
                status: 'active',
                version: 3,
                runner_config: { estimated_minutes: 18 },
                report_config: { title: 'Leadership report' },
              },
            },
          ],
        }),
        flowSteps: [
          {
            id: 'step-1',
            campaign_id: 'camp-1',
            step_type: 'assessment',
            sort_order: 0,
            is_active: true,
            campaign_assessment_id: 'ca-1',
            screen_config: {},
            created_at: '',
            updated_at: '',
          },
          {
            id: 'step-2',
            campaign_id: 'camp-1',
            step_type: 'assessment',
            sort_order: 1,
            is_active: true,
            campaign_assessment_id: 'ca-2',
            screen_config: {},
            created_at: '',
            updated_at: '',
          },
        ],
      }) as never
    )

    const result = await getAssessmentRuntimeCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.assessmentSteps).toHaveLength(2)
    expect(result.data.assessmentSteps.map((step) => step.assessment.id)).toEqual(['assess-1', 'assess-2'])
    expect(result.data.resolvedJourney.pages.filter((page) => page.type === 'assessment')).toHaveLength(2)
  })
})
