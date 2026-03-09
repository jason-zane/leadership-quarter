import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/assessment-runtime-public', () => ({
  getRuntimePublicAssessment: vi.fn(),
}))

import { GET } from '@/app/api/assessments/runtime/public/[assessmentKey]/route'
import { getRuntimePublicAssessment } from '@/utils/services/assessment-runtime-public'

const params = Promise.resolve({ assessmentKey: 'ai-readiness' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/assessments/runtime/public/[assessmentKey]', () => {
  it('returns the runtime public payload from the service', async () => {
    vi.mocked(getRuntimePublicAssessment).mockResolvedValue({
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
        questions: [],
        runnerConfig: {
          intro: 'A guided assessment experience',
          title: 'Assessment',
          subtitle: 'Answer each question based on your current experience so we can reflect your current profile clearly.',
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
      new Request('http://localhost/api/assessments/runtime/public/ai-readiness'),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.context).toBe('public')
    expect(body.assessment.key).toBe('ai-readiness')
  })

  it('maps missing assessments to 404', async () => {
    vi.mocked(getRuntimePublicAssessment).mockResolvedValue({
      ok: false,
      error: 'assessment_not_found',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/public/ai-readiness'),
      { params }
    )

    expect(res.status).toBe(404)
  })

  it('maps configuration or question failures to 500', async () => {
    vi.mocked(getRuntimePublicAssessment).mockResolvedValue({
      ok: false,
      error: 'questions_load_failed',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/public/ai-readiness'),
      { params }
    )

    expect(res.status).toBe(500)
  })
})
