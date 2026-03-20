import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/services/contacts', () => ({ upsertContactByEmail: vi.fn() }))
vi.mock('@/utils/assessments/email', () => ({ sendSurveyInvitationEmail: vi.fn() }))
vi.mock('@/utils/assessments/submission-pipeline', () => ({ submitAssessment: vi.fn() }))
vi.mock('@/utils/security/report-access', () => ({
  hasGateAccessTokenSecret: vi.fn().mockReturnValue(true),
  hasReportAccessTokenSecret: vi.fn().mockReturnValue(true),
  createGateAccessToken: vi.fn().mockReturnValue('gate-token'),
  createReportAccessToken: vi.fn().mockReturnValue('report-token'),
  GATE_TOKEN_TTL_SECONDS: 7200,
}))
vi.mock('@/utils/hosts', () => ({ getPortalBaseUrl: vi.fn().mockReturnValue('https://app.example.com') }))

import {
  registerAssessmentCampaignParticipant,
  submitAssessmentCampaign,
} from '@/utils/services/assessment-campaign-entry'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import {
  createGateAccessToken,
  createReportAccessToken,
} from '@/utils/security/report-access'
import { upsertContactByEmail } from '@/utils/services/contacts'
import { createAdminClient } from '@/utils/supabase/admin'

function makeCampaignRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'camp-1',
    name: 'Pilot',
    status: 'active',
    organisations: { name: 'Analytical Engines', slug: 'analytical-engines' },
    config: {
      registration_position: 'before',
      report_access: 'immediate',
      demographics_enabled: false,
      demographics_fields: [],
      entry_limit: null,
    },
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

function makeAdminClientMock(options?: {
  campaign?: unknown
  invitationInsert?: unknown
  existingInvitation?: unknown
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
  // Dedup lookup chain: select().eq().eq().in().or().limit().maybeSingle()
  const findExistingChain = {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.existingInvitation ?? null,
      error: null,
    }),
  }
  const invitationInsertQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn((field?: string) => {
      if (field === 'token') return findExistingChain
      return invitationInsertQuery
    }),
    eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
    single: vi.fn().mockResolvedValue({
      data: options?.invitationInsert ?? { id: 'inv-1', token: 'tok-1', started_at: null },
      error: null,
    }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'organisations') return organisationsQuery
      if (table === 'campaigns') return campaignQuery
      if (table === 'assessment_invitations') return invitationInsertQuery
      if (table === 'assessment_submissions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }
      }
      if (table === 'v2_assessment_reports') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {}
    }),
    invitationInsertQuery,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(upsertContactByEmail).mockResolvedValue({
    data: { id: 'contact-1' },
    error: null,
    missingTable: false,
  })
  vi.mocked(sendSurveyInvitationEmail).mockResolvedValue({ ok: true })
})

describe('registerAssessmentCampaignParticipant', () => {
  it('returns a configuration error when the admin client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await registerAssessmentCampaignParticipant({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
      },
    })

    expect(result).toEqual({ ok: false, error: 'missing_service_role' })
  })

  it('rejects invalid fields', async () => {
    const result = await registerAssessmentCampaignParticipant({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {
        firstName: '',
        lastName: '',
        email: 'bad-email',
      },
    })

    expect(result).toEqual({ ok: false, error: 'invalid_fields' })
  })

  it('creates an invitation and returns the survey token', async () => {
    const adminClient = makeAdminClientMock({ campaign: makeCampaignRow() })
    vi.mocked(createAdminClient).mockReturnValue(adminClient as never)

    const result = await registerAssessmentCampaignParticipant({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        organisation: 'Analytical Engines',
        role: 'Lead',
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        token: 'tok-1',
        surveyPath: '/assess/i/tok-1',
      },
    })
    expect(sendSurveyInvitationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        invitationUrl: 'https://app.example.com/assess/i/tok-1',
      })
    )
  })

  it('stores enabled demographics on the invitation', async () => {
    const adminClient = makeAdminClientMock({
      campaign: makeCampaignRow({
        config: {
          registration_position: 'before',
          report_access: 'immediate',
          demographics_enabled: true,
          demographics_fields: ['job_level', 'ethnicity_race'],
        },
      }),
    })
    vi.mocked(createAdminClient).mockReturnValue(adminClient as never)

    await registerAssessmentCampaignParticipant({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        demographics: {
          job_level: 'director',
          ethnicity_race: ['asian', 'self_describe'],
          ethnicity_race_self_describe: 'Mixed',
          ignored_field: 'nope',
        },
      },
    })

    expect(adminClient.invitationInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        demographics: {
          job_level: 'director',
          ethnicity_race: ['asian', 'self_describe'],
          ethnicity_race_self_describe: 'Mixed',
        },
      })
    )
  })
})

describe('submitAssessmentCampaign', () => {
  it('rejects invalid payloads', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({ campaign: makeCampaignRow() }) as never
    )

    const result = await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {},
    })

    expect(result).toEqual({ ok: false, error: 'invalid_payload' })
  })

  it('returns complete_no_report when report access is disabled', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        campaign: makeCampaignRow({
          config: {
            registration_position: 'before',
            report_access: 'none',
            demographics_enabled: false,
            demographics_fields: [],
          },
        }),
      }) as never
    )
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        assessment: { id: 'assess-1', key: 'ai', name: 'AI' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    const result = await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: true,
      assessmentId: 'assess-1',
      data: { nextStep: 'complete_no_report' },
    })
  })

  it('returns a contact gate path when report access is gated', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        campaign: makeCampaignRow({
          config: {
            registration_position: 'before',
            report_access: 'gated',
            demographics_enabled: false,
            demographics_fields: [],
          },
        }),
      }) as never
    )
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        assessment: { id: 'assess-1', key: 'ai', name: 'AI' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    const result = await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: true,
      assessmentId: 'assess-1',
      data: {
        nextStep: 'contact_gate',
        gatePath: '/assess/contact?gate=gate-token',
      },
    })
    expect(createGateAccessToken).toHaveBeenCalled()
  })

  it('returns a report token when report access is immediate', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({ campaign: makeCampaignRow() }) as never
    )
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        assessment: { id: 'assess-1', key: 'ai', name: 'AI' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    const result = await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: true,
      assessmentId: 'assess-1',
      data: {
        submissionId: 'sub-1',
        reportPath: '/assess/r/assessment',
        reportAccessToken: 'report-token',
      },
    })
    expect(createReportAccessToken).toHaveBeenCalled()
  })

  it('propagates pipeline errors', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({ campaign: makeCampaignRow() }) as never
    )
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: false,
      error: 'invalid_responses',
    })

    const result = await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: false,
      error: 'invalid_responses',
      assessmentId: 'assess-1',
    })
  })

  it('creates an invitation and forwards participant details when registration is after the assessment', async () => {
    const adminClient = makeAdminClientMock({
      campaign: makeCampaignRow({
        config: {
          registration_position: 'after',
          report_access: 'immediate',
          demographics_enabled: true,
          demographics_fields: ['job_level'],
        },
      }),
      invitationInsert: { id: 'inv-after', started_at: null },
    })
    vi.mocked(createAdminClient).mockReturnValue(adminClient as never)
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        assessment: { id: 'assess-1', key: 'ai', name: 'AI' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {
        responses: { q1: 3 },
        participant: {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
          organisation: 'Analytical Engines',
          role: 'Lead',
        },
        demographics: {
          job_level: 'director',
        },
      },
    })

    expect(adminClient.invitationInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        demographics: { job_level: 'director' },
      })
    )
    expect(submitAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        invitation: expect.objectContaining({
          id: 'inv-after',
          email: 'ada@example.com',
        }),
        demographics: { job_level: 'director' },
      })
    )
  })

  it('does not use after-assessment registration flow when a campaign has multiple assessments', async () => {
    const adminClient = makeAdminClientMock({
      campaign: makeCampaignRow({
        config: {
          registration_position: 'after',
          report_access: 'immediate',
          demographics_enabled: false,
          demographics_fields: [],
        },
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
            },
          },
        ],
      }),
      invitationInsert: { id: 'inv-after', started_at: null },
    })
    vi.mocked(createAdminClient).mockReturnValue(adminClient as never)
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        assessment: { id: 'assess-1', key: 'ai', name: 'AI' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {
        responses: { q1: 3 },
      },
    })

    expect(adminClient.invitationInsertQuery.insert).not.toHaveBeenCalled()
    expect(submitAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        participant: expect.objectContaining({
          email: null,
        }),
      })
    )
  })

  it('passes anonymous demographics through when registration is disabled', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        campaign: makeCampaignRow({
          config: {
            registration_position: 'none',
            report_access: 'immediate',
            demographics_enabled: true,
            demographics_fields: ['region', 'ethnicity_race'],
          },
        }),
      }) as never
    )
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        assessment: { id: 'assess-1', key: 'ai', name: 'AI' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {
        responses: { q1: 3 },
        demographics: {
          region: 'apac',
          ethnicity_race: ['prefer_not_to_say'],
        },
      },
    })

    expect(submitAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        participant: expect.objectContaining({
          email: null,
        }),
        demographics: {
          region: 'apac',
          ethnicity_race: ['prefer_not_to_say'],
        },
      })
    )
  })

  it('submits the requested assessment id for intermediate multi-assessment steps', async () => {
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
              },
            },
          ],
        }),
      }) as never
    )
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-2',
        assessment: { id: 'assess-2', key: 'leadership', name: 'Leadership Quotient' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    const result = await submitAssessmentCampaign({
      organisationSlug: 'analytical-engines',
      campaignSlug: 'pilot',
      payload: {
        assessmentId: 'assess-2',
        isFinalAssessment: false,
        responses: { q1: 4 },
      },
    })

    expect(submitAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: 'assess-2',
      })
    )
    expect(result).toEqual({
      ok: true,
      assessmentId: 'assess-2',
      data: { nextStep: 'complete_no_report' },
    })
  })
})
