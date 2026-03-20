import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssessmentReportData } from '@/utils/reports/assessment-report'

vi.mock('@/utils/reports/assessment-report', () => ({
  getAssessmentReportData: vi.fn(),
}))

import { getAssessmentReportData } from '@/utils/reports/assessment-report'
import { getAiOrientationSurveyReportData } from '@/utils/reports/ai-orientation-report'

function makeAssessmentReport(
  overrides: Partial<AssessmentReportData> = {}
): AssessmentReportData {
  return {
    submissionId: 'assessment-sub-1',
    assessment: {
      id: 'assessment-1',
      key: 'ai_readiness_orientation_v1',
      name: 'AI Readiness Orientation Survey',
      description: null,
    },
    participant: {
      firstName: 'Jason',
      lastName: 'Hunt',
      email: 'jason@example.com',
      organisation: null,
      role: null,
      status: null,
      completedAt: '2026-03-09T10:00:00.000Z',
      createdAt: '2026-03-09T09:00:00.000Z',
    },
    scores: {},
    bands: {
      openness: 'Conditional Adopter',
      riskPosture: 'Moderate Awareness',
      capability: 'Developing',
    },
    classification: {
      key: 'developing_operator',
      label: 'Developing Operator',
      description: null,
    },
    dimensions: [
      {
        key: 'openness',
        label: 'Curiosity',
        internalLabel: 'Openness to AI',
        descriptor: 'Conditional Adopter',
        description: 'Explores new tools when they feel relevant.',
        bandMeaning: 'Open to AI when the use case is practical and low-risk.',
        bandIndex: 1,
        bandCount: 3,
      },
    ],
    traitScores: [
      {
        traitId: 'trait-1',
        traitCode: 'openness',
        traitName: 'Curiosity',
        traitExternalName: null,
        dimensionId: 'dimension-1',
        dimensionCode: 'openness',
        dimensionName: 'Curiosity',
        dimensionExternalName: null,
        dimensionPosition: 0,
        rawScore: 3.8,
        rawN: 4,
        scoreMethod: 'mean',
        description: null,
        zScore: 0.4,
        percentile: 66,
        band: 'mid',
        alpha: 0.82,
        normSd: 0.7,
      },
    ],
    interpretations: [
      {
        targetType: 'trait',
        ruleType: 'band_text',
        title: 'Curiosity',
        body: 'You are open to AI when the context is clear and the value is evident.',
        priority: 1,
      },
    ],
    hasPsychometricData: true,
    recommendations: ['Focus on practical experimentation.'],
    dimensionProfiles: [],
    traitProfiles: [],
    profileStatus: { dimension: 'unavailable', trait: 'unavailable' },
    campaign: null,
    reportConfig: {
      title: 'AI Readiness Orientation Survey',
      subtitle: 'Assessment subtitle',
      show_overall_classification: true,
      show_dimension_scores: true,
      show_recommendations: true,
      show_trait_scores: true,
      show_interpretation_text: true,
      next_steps_cta_label: 'Back',
      next_steps_cta_href: '/framework/lq-ai-readiness',
      pdf_enabled: true,
      pdf_hidden_sections: [],
      report_template: 'default',
      sten_fallback_mode: 'raw',
      profile_card_scope: 'both',
      v2_runtime_enabled: false,
      v2_cutover_status: 'draft',
      scoring_display_mode: 'percentile' as const,
      competency_overrides: {},
      trait_overrides: {},
    },
    ...overrides,
  }
}

function makeAdminClient(input: {
  interestSubmission?: {
    first_name: string
    last_name: string
    email: string | null
    created_at: string
    assessment_submission_id: string | null
    answers: Record<string, unknown>
  } | null
  assessmentReportConfig?: unknown
}) {
  return {
    from(table: string) {
      if (table === 'interest_submissions') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: input.interestSubmission ?? null,
                    error: input.interestSubmission ? null : { message: 'not found' },
                  }),
                }
              },
            }
          },
        }
      }

      if (table === 'assessments') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { report_config: input.assessmentReportConfig ?? null },
                    error: null,
                  }),
                }
              },
            }
          },
        }
      }

      throw new Error(`Unexpected table ${table}`)
    },
  }
}

describe('getAiOrientationSurveyReportData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hydrates percentile data from the linked assessment submission when available', async () => {
    vi.mocked(getAssessmentReportData).mockResolvedValue(makeAssessmentReport())
    const adminClient = makeAdminClient({
      interestSubmission: {
        first_name: 'Jason',
        last_name: 'Hunt',
        email: 'jason@example.com',
        created_at: '2026-03-09T09:00:00.000Z',
        assessment_submission_id: 'assessment-sub-1',
        answers: {},
      },
    })

    const result = await getAiOrientationSurveyReportData(adminClient as never, 'interest-sub-1')

    expect(getAssessmentReportData).toHaveBeenCalledWith(adminClient, 'assessment-sub-1')
    expect(result).toMatchObject({
      submissionId: 'interest-sub-1',
      sectionAvailability: expect.objectContaining({
        percentile_benchmark: true,
        narrative_insights: true,
      }),
    })
    expect(result?.competencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Curiosity',
          internalLabel: 'Openness to AI',
          description: 'Explores new tools when they feel relevant.',
          bandMeaning: 'Open to AI when the use case is practical and low-risk.',
        }),
      ])
    )
    expect(result?.traitScores).toHaveLength(1)
  })

  it('suppresses percentile benchmark when the linked assessment report uses raw scores', async () => {
    vi.mocked(getAssessmentReportData).mockResolvedValue(
      makeAssessmentReport({
        reportConfig: {
          title: 'AI Readiness Orientation Survey',
          subtitle: 'Assessment subtitle',
          show_overall_classification: true,
          show_dimension_scores: true,
          show_recommendations: true,
          show_trait_scores: true,
          show_interpretation_text: true,
          next_steps_cta_label: 'Back',
          next_steps_cta_href: '/framework/lq-ai-readiness',
          pdf_enabled: true,
          pdf_hidden_sections: [],
          report_template: 'default',
          sten_fallback_mode: 'raw',
          profile_card_scope: 'both',
          v2_runtime_enabled: false,
          v2_cutover_status: 'draft',
          scoring_display_mode: 'raw',
          competency_overrides: {},
          trait_overrides: {},
        },
      })
    )
    const adminClient = makeAdminClient({
      interestSubmission: {
        first_name: 'Jason',
        last_name: 'Hunt',
        email: 'jason@example.com',
        created_at: '2026-03-09T09:00:00.000Z',
        assessment_submission_id: 'assessment-sub-1',
        answers: {},
      },
    })

    const result = await getAiOrientationSurveyReportData(adminClient as never, 'interest-sub-1')

    expect(result?.sectionAvailability.percentile_benchmark).toBe(false)
  })

  it('falls back to the legacy interest submission payload when no assessment link exists', async () => {
    vi.mocked(getAssessmentReportData).mockResolvedValue(null)
    const adminClient = makeAdminClient({
      interestSubmission: {
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        created_at: '2026-03-09T09:00:00.000Z',
        assessment_submission_id: null,
        answers: {
          classification: 'Developing Operator',
          openness_band: 'Conditional Adopter',
          risk_posture_band: 'Moderate Awareness',
          capability_band: 'Developing',
        },
      },
      assessmentReportConfig: {
        show_overall_classification: true,
        show_dimension_scores: true,
        show_recommendations: true,
        show_trait_scores: true,
        show_interpretation_text: true,
        competency_overrides: {},
      },
    })

    const result = await getAiOrientationSurveyReportData(adminClient as never, 'interest-sub-1')

    expect(result).toMatchObject({
      submissionId: 'interest-sub-1',
      firstName: 'Ada',
      sectionAvailability: expect.objectContaining({
        percentile_benchmark: false,
        narrative_insights: true,
      }),
    })
    expect(result?.traitScores).toEqual([])
  })
})
