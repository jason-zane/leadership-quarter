import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/assessment-runtime-campaign', () => ({
  getAssessmentRuntimeCampaign: vi.fn(),
}))

import { GET } from '@/app/api/assessments/runtime/campaign/[slug]/route'
import { getAssessmentRuntimeCampaign } from '@/utils/services/assessment-runtime-campaign'

const params = Promise.resolve({ slug: 'pilot' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/assessments/runtime/campaign/[slug]', () => {
  it('returns the runtime campaign payload from the service', async () => {
    vi.mocked(getAssessmentRuntimeCampaign).mockResolvedValue({
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
            entry_limit: null,
          },
        },
        assessment: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          version: 2,
        },
        questions: [],
        runnerConfig: {
          intro: 'Analytical Engines assessment',
          title: 'Pilot',
          subtitle: 'A guided assessment experience',
          estimated_minutes: 8,
          start_cta_label: 'Start assessment',
          completion_cta_label: 'Submit responses',
          progress_style: 'bar',
          question_presentation: 'single',
          show_dimension_badges: true,
          confirmation_copy: 'Thanks. Your responses have been recorded.',
          completion_screen_title: 'Assessment complete',
          completion_screen_body: 'Thank you. Your responses have been submitted successfully.',
          completion_screen_cta_label: 'Return to Leadership Quarter',
          completion_screen_cta_href: '/assess',
          support_contact_email: '',
          theme_variant: 'minimal',
          data_collection_only: false,
        },
        reportConfig: {
          title: 'Assessment report',
          subtitle: 'Your current profile and recommended next steps.',
          show_overall_classification: true,
          show_dimension_scores: true,
          show_recommendations: true,
          show_trait_scores: true,
          show_interpretation_text: true,
          next_steps_cta_label: 'Back to assessments',
          next_steps_cta_href: '/assess',
          pdf_enabled: true,
          scoring_display_mode: 'percentile' as const,
          competency_overrides: {},
        },
      },
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/campaign/pilot'),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.context).toBe('campaign')
    expect(body.assessment.version).toBe(2)
  })

  it('maps missing campaigns to 404', async () => {
    vi.mocked(getAssessmentRuntimeCampaign).mockResolvedValue({
      ok: false,
      error: 'campaign_not_found',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/campaign/pilot'),
      { params }
    )

    expect(res.status).toBe(404)
  })

  it('maps inactive campaign or assessment to 410', async () => {
    vi.mocked(getAssessmentRuntimeCampaign).mockResolvedValue({
      ok: false,
      error: 'assessment_not_active',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/campaign/pilot'),
      { params }
    )

    expect(res.status).toBe(410)
  })

  it('maps configuration and question failures to 500', async () => {
    vi.mocked(getAssessmentRuntimeCampaign).mockResolvedValue({
      ok: false,
      error: 'questions_load_failed',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/campaign/pilot'),
      { params }
    )

    expect(res.status).toBe(500)
  })
})
