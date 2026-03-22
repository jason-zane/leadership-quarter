import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/assessment-campaign-access', () => ({
  getAssessmentCampaign: vi.fn(),
}))

import { GET } from '@/app/api/assessments/campaigns/[slug]/route'
import { getAssessmentCampaign } from '@/utils/services/assessment-campaign-access'

const params = Promise.resolve({ slug: 'pilot' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/assessments/campaigns/[slug]', () => {
  it('returns the campaign access payload from the service', async () => {
    vi.mocked(getAssessmentCampaign).mockResolvedValue({
      ok: true,
      data: {
        campaign: {
          id: 'camp-1',
          name: 'Pilot',
          slug: 'pilot',
          organisationSlug: 'leadership-quarter',
          config: {
            registration_position: 'before',
            report_access: 'immediate',
            demographics_enabled: false,
            demographics_fields: [],
            demographics_position: 'after',
            entry_limit: null,
            branding_mode: 'lq',
            branding_logo_url: null,
            branding_company_name: null,
          },
          organisation: 'Analytical Engines',
          brandingConfig: {
            theme_version: 1,
            branding_enabled: false,
            logo_url: null,
            favicon_url: null,
            hero_gradient_start_color: null,
            hero_gradient_end_color: null,
            canvas_tint_color: null,
            primary_cta_color: null,
            secondary_cta_accent_color: null,
            hero_text_color_override: null,
            primary_color: null,
            secondary_color: null,
            surface_tint_color: null,
            hero_surface_color: null,
            company_name: null,
            show_lq_attribution: true,
          },
        },
        assessments: [
          {
            id: 'ca-1',
            assessment: {
              id: 'assess-1',
              key: 'ai',
              name: 'AI Readiness',
              description: null,
            },
            survey: {
              id: 'assess-1',
              key: 'ai',
              name: 'AI Readiness',
              description: null,
            },
          },
        ],
        assessment: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
        },
        survey: {
          id: 'assess-1',
          key: 'ai',
          name: 'AI Readiness',
          description: null,
        },
      },
    })

    const res = await GET(new Request('http://localhost/api/assessments/campaigns/pilot'), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.survey.key).toBe('ai')
    expect(body.campaign.slug).toBe('pilot')
  })

  it('maps missing campaigns to 404', async () => {
    vi.mocked(getAssessmentCampaign).mockResolvedValue({
      ok: false,
      error: 'campaign_not_found',
    })

    const res = await GET(new Request('http://localhost/api/assessments/campaigns/pilot'), { params })

    expect(res.status).toBe(404)
  })

  it('maps inactive campaigns to 410', async () => {
    vi.mocked(getAssessmentCampaign).mockResolvedValue({
      ok: false,
      error: 'campaign_not_active',
    })

    const res = await GET(new Request('http://localhost/api/assessments/campaigns/pilot'), { params })

    expect(res.status).toBe(410)
  })

  it('maps configuration failures to 500', async () => {
    vi.mocked(getAssessmentCampaign).mockResolvedValue({
      ok: false,
      error: 'missing_service_role',
    })

    const res = await GET(new Request('http://localhost/api/assessments/campaigns/pilot'), { params })

    expect(res.status).toBe(500)
  })
})
