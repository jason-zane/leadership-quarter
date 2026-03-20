import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/reports/ai-orientation-report', () => ({
  getAiOrientationSurveyReportData: vi.fn(),
}))
vi.mock('@/utils/security/report-access', () => ({
  verifyReportAccessToken: vi.fn(),
}))
vi.mock('@/utils/services/email-jobs', () => ({
  enqueueAssessmentReportEmailJob: vi.fn(),
}))

import {
  queueAiSurveyReportEmail,
  resolveAiSurveyReportEmailAccess,
} from '@/utils/services/ai-survey-report-email'
import { getAiOrientationSurveyReportData } from '@/utils/reports/ai-orientation-report'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { enqueueAssessmentReportEmailJob } from '@/utils/services/email-jobs'
import { createAdminClient } from '@/utils/supabase/admin'
import { DEFAULT_REPORT_CONFIG } from '@/utils/assessments/experience-config'

beforeEach(() => {
  vi.clearAllMocks()
})

const defaultAiSurveyReport = {
  submissionId: 'sub-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  completedAt: '2026-03-09T10:00:00.000Z',
  classification: 'Developing Operator' as const,
  opennessBand: 'Conditional Adopter' as const,
  riskBand: 'Moderate Awareness' as const,
  capabilityBand: 'Developing' as const,
  profileNarrative: 'Profile narrative',
  traitScores: [],
  competencies: [
    {
      key: 'curiosity' as const,
      label: 'Curiosity',
      internalLabel: 'Curiosity',
      description: 'Curiosity description',
      band: 'Conditional Adopter',
      bandMeaning: 'Curiosity meaning',
      commentary: 'Curiosity commentary',
    },
    {
      key: 'judgement' as const,
      label: 'Judgement',
      internalLabel: 'Judgement',
      description: 'Judgement description',
      band: 'Moderate Awareness',
      bandMeaning: 'Judgement meaning',
      commentary: 'Judgement commentary',
    },
    {
      key: 'skill' as const,
      label: 'Skill',
      internalLabel: 'Skill',
      description: 'Skill description',
      band: 'Developing',
      bandMeaning: 'Skill meaning',
      commentary: 'Skill commentary',
    },
  ],
  narrativeInsights: [
    { title: 'Curiosity', body: 'Curiosity commentary' },
    { title: 'Judgement', body: 'Judgement commentary' },
    { title: 'Skill', body: 'Skill commentary' },
  ],
  recommendations: [],
  reportConfig: DEFAULT_REPORT_CONFIG,
  sectionAvailability: {
    overall_profile: true,
    competency_cards: true,
    percentile_benchmark: false,
    narrative_insights: true,
    development_recommendations: false,
  },
}

describe('ai survey report email services', () => {
  it('returns invalid_access when the report token is invalid', () => {
    vi.mocked(verifyReportAccessToken).mockReturnValue(null)

    const result = resolveAiSurveyReportEmailAccess('bad-token')

    expect(result).toEqual({
      ok: false,
      error: 'invalid_access',
      message: 'This report link is no longer valid.',
    })
  })

  it('returns the submission id when the report token is valid', () => {
    vi.mocked(verifyReportAccessToken).mockReturnValue({
      report: 'ai_survey',
      submissionId: 'sub-1',
      selectionMode: null,
      reportVariantId: null,
      exp: 9999999999,
    })

    const result = resolveAiSurveyReportEmailAccess('good-token')

    expect(result).toEqual({ ok: true, submissionId: 'sub-1' })
  })

  it('returns missing_recipient_email when no email is available', async () => {
    vi.mocked(createAdminClient).mockReturnValue({} as never)
    vi.mocked(getAiOrientationSurveyReportData).mockResolvedValue({
      ...defaultAiSurveyReport,
      email: null,
    })

    const result = await queueAiSurveyReportEmail({ submissionId: 'sub-1' })

    expect(result).toEqual({
      ok: false,
      error: 'missing_recipient_email',
      message: 'No email address is available for this report.',
    })
  })

  it('queues an ai_survey report email when data is valid', async () => {
    vi.mocked(createAdminClient).mockReturnValue({} as never)
    vi.mocked(getAiOrientationSurveyReportData).mockResolvedValue({
      ...defaultAiSurveyReport,
      email: 'ada@example.com',
    })
    vi.mocked(enqueueAssessmentReportEmailJob).mockResolvedValue({ error: null })

    const result = await queueAiSurveyReportEmail({ submissionId: 'sub-1' })

    expect(enqueueAssessmentReportEmailJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        submissionId: 'sub-1',
        to: 'ada@example.com',
        reportType: 'ai_survey',
      })
    )
    expect(result).toEqual({
      ok: true,
      data: {
        message: 'Report link email queued for ada@example.com.',
      },
    })
  })
})
