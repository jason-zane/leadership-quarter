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
    config: {
      registration_position: 'before',
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
    ],
    ...overrides,
  }
}

function makeAdminClientMock(options?: {
  campaign?: unknown
  invitationInsert?: unknown
}) {
  const campaignQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.campaign ?? null,
      error: null,
    }),
  }
  const invitationInsertQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: options?.invitationInsert ?? { id: 'inv-1', token: 'tok-1' },
      error: null,
    }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') return campaignQuery
      if (table === 'assessment_invitations') return invitationInsertQuery
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
      slug: 'pilot',
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
      slug: 'pilot',
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
      slug: 'pilot',
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
})

describe('submitAssessmentCampaign', () => {
  it('rejects invalid payloads', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({ campaign: makeCampaignRow() }) as never
    )

    const result = await submitAssessmentCampaign({
      slug: 'pilot',
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
      slug: 'pilot',
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
      slug: 'pilot',
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
      slug: 'pilot',
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
      slug: 'pilot',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: false,
      error: 'invalid_responses',
      assessmentId: 'assess-1',
    })
  })
})
