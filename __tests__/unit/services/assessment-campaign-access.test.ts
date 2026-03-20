import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { getAssessmentCampaign } from '@/utils/services/assessment-campaign-access'
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
        },
      },
    ],
    ...overrides,
  }
}

function makeAdminClientMock(campaign: unknown) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'organisations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'org-1', name: 'Analytical Engines', slug: 'analytical-engines' },
            error: null,
          }),
        }
      }

      if (table === 'campaigns') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: campaign, error: null }),
        }
      }

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

      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getAssessmentCampaign', () => {
  it('returns a configuration error when the admin client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await getAssessmentCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

    expect(result).toEqual({ ok: false, error: 'missing_service_role' })
  })

  it('returns campaign_not_found when the slug does not resolve', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock(null) as never)

    const result = await getAssessmentCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

    expect(result).toEqual({ ok: false, error: 'campaign_not_found' })
  })

  it('returns survey_not_active when no active assessments are available', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock(
        makeCampaignRow({
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
              },
            },
          ],
        })
      ) as never
    )

    const result = await getAssessmentCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

    expect(result).toEqual({ ok: false, error: 'survey_not_active' })
  })

  it('returns the campaign payload with assessment and survey aliases', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock(makeCampaignRow()) as never
    )

    const result = await getAssessmentCampaign({ organisationSlug: 'analytical-engines', campaignSlug: 'pilot' })

    expect(result).toEqual({
      ok: true,
      data: {
        campaign: {
          id: 'camp-1',
          name: 'Pilot',
          slug: 'pilot',
          organisationSlug: 'analytical-engines',
          config: {
            registration_position: 'before',
            report_access: 'immediate',
            demographics_enabled: false,
            demographics_fields: [],
            demographics_position: 'before',
            entry_limit: null,
          },
          organisation: 'Analytical Engines',
          brandingConfig: {
            branding_enabled: false,
            logo_url: null,
            favicon_url: null,
            primary_color: null,
            secondary_color: null,
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
  })
})
