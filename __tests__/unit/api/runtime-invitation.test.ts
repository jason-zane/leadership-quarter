import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/assessment-runtime-invitation', () => ({
  getRuntimeInvitationAssessment: vi.fn(),
}))

import { GET } from '@/app/api/assessments/runtime/invitation/[token]/route'
import { getRuntimeInvitationAssessment } from '@/utils/services/assessment-runtime-invitation'

const params = Promise.resolve({ token: 'tok123' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/assessments/runtime/invitation/[token]', () => {
  it('returns the runtime invitation payload from the service', async () => {
    vi.mocked(getRuntimeInvitationAssessment).mockResolvedValue({
      ok: true,
      data: {
        context: 'invitation',
        assessment: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
          version: 1,
        },
        invitation: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          organisation: 'Analytical Engines',
          role: 'Lead',
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
        brandingConfig: {
          branding_enabled: false,
          logo_url: null,
          favicon_url: null,
          primary_color: null,
          secondary_color: null,
          company_name: null,
          show_lq_attribution: true,
        },
        scale: { points: 5, labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] },
      },
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/invitation/tok123'),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.context).toBe('invitation')
    expect(body.invitation.firstName).toBe('Ada')
  })

  it('maps missing invitations to 404', async () => {
    vi.mocked(getRuntimeInvitationAssessment).mockResolvedValue({
      ok: false,
      error: 'invitation_not_found',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/invitation/tok123'),
      { params }
    )

    expect(res.status).toBe(404)
  })

  it('maps availability failures to 410', async () => {
    vi.mocked(getRuntimeInvitationAssessment).mockResolvedValue({
      ok: false,
      error: 'invitation_expired',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/invitation/tok123'),
      { params }
    )

    expect(res.status).toBe(410)
  })

  it('maps configuration or question failures to 500', async () => {
    vi.mocked(getRuntimeInvitationAssessment).mockResolvedValue({
      ok: false,
      error: 'questions_load_failed',
    })

    const res = await GET(
      new Request('http://localhost/api/assessments/runtime/invitation/tok123'),
      { params }
    )

    expect(res.status).toBe(500)
  })
})
