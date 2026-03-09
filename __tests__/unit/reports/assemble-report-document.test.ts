import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssessmentReportData } from '@/utils/reports/assessment-report'

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/utils/security/report-access', () => ({
  verifyReportAccessToken: vi.fn(),
}))

vi.mock('@/utils/reports/assessment-report', () => ({
  getAssessmentReportData: vi.fn(),
  getAssessmentReportFilename: vi.fn().mockReturnValue('generic-assessment-report.pdf'),
}))

import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import { getAssessmentReportData } from '@/utils/reports/assessment-report'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'

function makeAssessmentReport(
  overrides: Partial<AssessmentReportData> = {}
): AssessmentReportData {
  return {
    submissionId: 'submission-1',
    assessment: {
      id: 'assessment-1',
      key: 'leadership-profile',
      name: 'Leadership Profile',
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
    bands: {},
    classification: {
      key: 'default',
      label: 'Default',
      description: null,
    },
    dimensions: [],
    traitScores: [],
    interpretations: [],
    hasPsychometricData: false,
    recommendations: [],
    campaign: null,
    reportConfig: {
      title: 'Leadership Profile',
      subtitle: '',
      show_overall_classification: true,
      show_dimension_scores: true,
      show_recommendations: true,
      show_trait_scores: true,
      show_interpretation_text: true,
      next_steps_cta_label: 'Back',
      next_steps_cta_href: '/assess',
      pdf_enabled: true,
      scoring_display_mode: 'percentile' as const,
      competency_overrides: {},
    },
    ...overrides,
  }
}

describe('assembleReportDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createAdminClient).mockReturnValue({} as never)
    vi.mocked(verifyReportAccessToken).mockReturnValue({ submissionId: 'submission-1' } as never)
  })

  it('maps the AI readiness orientation assessment to the bespoke ai_survey document', async () => {
    vi.mocked(getAssessmentReportData).mockResolvedValue(
      makeAssessmentReport({
        assessment: {
          id: 'assessment-1',
          key: 'ai_readiness_orientation_v1',
          name: 'AI Readiness Orientation Survey',
          description: null,
        },
        dimensions: [
          {
            key: 'openness',
            label: 'Curiosity',
            internalLabel: 'Openness to AI',
            descriptor: 'Conditional Adopter',
            description: 'Explores practical AI opportunities.',
            bandMeaning: 'Open to AI when the use case is practical and low-risk.',
            bandIndex: 1,
            bandCount: 3,
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
        bands: {
          openness: 'Conditional Adopter',
          riskPosture: 'Moderate Awareness',
          capability: 'Developing',
        },
        classification: {
          key: 'developing_operator',
          label: 'Developing Operator',
          description: 'Shows some readiness, but still needs balanced development across the model.',
        },
        recommendations: ['Focus on practical experimentation.', 'Strengthen verification habits.'],
        hasPsychometricData: true,
      })
    )

    const result = await assembleReportDocument({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.kind).toBe('ai_survey')
    if (result.data.kind !== 'ai_survey') return

    expect(result.data.filename).toBe('ai-orientation-survey-jason-hunt-report.pdf')
    expect(result.data.report).toMatchObject({
      submissionId: 'submission-1',
      firstName: 'Jason',
      lastName: 'Hunt',
      classification: 'Developing Operator',
      opennessBand: 'Conditional Adopter',
      riskBand: 'Moderate Awareness',
      capabilityBand: 'Developing',
      recommendations: ['Focus on practical experimentation.', 'Strengthen verification habits.'],
      reportConfig: expect.objectContaining({
        show_overall_classification: true,
        show_dimension_scores: true,
        show_trait_scores: true,
        show_interpretation_text: true,
        show_recommendations: true,
      }),
      sectionAvailability: expect.objectContaining({
        overall_profile: true,
        competency_cards: true,
        percentile_benchmark: false,
        narrative_insights: true,
        development_recommendations: true,
      }),
    })
  })

  it('keeps non-AI assessments on the generic assessment document path', async () => {
    vi.mocked(getAssessmentReportData).mockResolvedValue(makeAssessmentReport())

    const result = await assembleReportDocument({
      reportType: 'assessment',
      accessToken: 'good-token',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.kind).toBe('assessment')
    if (result.data.kind !== 'assessment') return

    expect(result.data.filename).toBe('generic-assessment-report.pdf')
  })
})
