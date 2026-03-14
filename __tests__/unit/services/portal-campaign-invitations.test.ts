import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/email', () => ({
  sendSurveyInvitationEmail: vi.fn(),
}))

import {
  createPortalCampaignInvitations,
  listPortalCampaignInvitations,
  parsePortalCampaignInvitationsPayload,
} from '@/utils/services/portal-campaign-invitations'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'

function createListAdminClient(options?: {
  campaign?: unknown
  invitations?: unknown[]
  invitationError?: unknown
}) {
  const campaignsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: options?.campaign ?? null, error: null }),
  }
  const invitationsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.invitations ?? [],
      error: options?.invitationError ?? null,
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') return campaignsQuery
      if (table === 'assessment_invitations') return invitationsQuery
      return {}
    }),
  }
}

function createCreateAdminClient(options?: {
  campaign?: unknown
  insertedRows?: unknown[]
  insertError?: unknown
}) {
  const campaignsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: options?.campaign ?? null, error: null }),
  }
  const insertQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({
      data: options?.insertedRows ?? [],
      error: options?.insertError ?? null,
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') return campaignsQuery
      if (table === 'assessment_invitations') return insertQuery
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(sendSurveyInvitationEmail).mockResolvedValue({ ok: true })
})

describe('parsePortalCampaignInvitationsPayload', () => {
  it('normalizes aliases and defaults', () => {
    expect(
      parsePortalCampaignInvitationsPayload({
        sendNow: true,
        expiresAt: '2026-01-01T00:00:00Z',
        invitations: [{ email: 'ada@example.com' }],
      })
    ).toEqual({
      sendNow: true,
      expiresAt: '2026-01-01T00:00:00Z',
      invitations: [{ email: 'ada@example.com' }],
    })
  })
})

describe('listPortalCampaignInvitations', () => {
  it('returns not found when the campaign is outside the organisation', async () => {
    const result = await listPortalCampaignInvitations({
      adminClient: createListAdminClient() as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })
  })

  it('returns the invitation rows for the campaign', async () => {
    const result = await listPortalCampaignInvitations({
      adminClient: createListAdminClient({
        campaign: { id: 'camp-1' },
        invitations: [{ id: 'inv-1', email: 'ada@example.com', assessment_id: 'assess-1', first_name: null, last_name: null, status: 'pending', created_at: '2026-01-01T00:00:00Z' }],
      }) as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        invitations: [
          {
            id: 'inv-1',
            campaign_id: undefined,
            assessment_id: 'assess-1',
            email: 'ada@example.com',
            first_name: null,
            last_name: null,
            organisation: null,
            role: null,
            status: 'pending',
            sent_at: null,
            opened_at: null,
            started_at: null,
            completed_at: null,
            expires_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
      },
    })
  })
})

describe('createPortalCampaignInvitations', () => {
  const campaign = {
    id: 'camp-1',
    campaign_assessments: [
      {
        assessment_id: 'assess-1',
        sort_order: 0,
        is_active: true,
        assessments: { id: 'assess-1', name: 'AI Readiness', status: 'active' },
      },
      {
        assessment_id: 'assess-2',
        sort_order: 1,
        is_active: true,
        assessments: { id: 'assess-2', name: 'LQ8', status: 'active' },
      },
    ],
  }

  it('returns a validation error when no invitations are provided', async () => {
    const result = await createPortalCampaignInvitations({
      adminClient: createCreateAdminClient() as never,
      organisationId: 'org-1',
      userId: 'user-1',
      campaignId: 'camp-1',
      portalBaseUrl: 'https://portal.example.com',
      payload: {},
    })

    expect(result).toEqual({
      ok: false,
      error: 'validation_error',
      message: 'At least one invitation is required.',
    })
  })

  it('returns row-level validation errors when every invitation is invalid', async () => {
    const result = await createPortalCampaignInvitations({
      adminClient: createCreateAdminClient({ campaign }) as never,
      organisationId: 'org-1',
      userId: 'user-1',
      campaignId: 'camp-1',
      portalBaseUrl: 'https://portal.example.com',
      payload: {
        invitations: [
          { email: 'bad-email' },
          { email: 'ada@example.com', assessment_id: 'assess-x' },
        ],
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'validation_error',
      message: 'No valid invitations were provided.',
      errors: [
        { row_index: 0, code: 'invalid_email', message: 'Invalid email address.' },
        {
          row_index: 1,
          code: 'invalid_assessment',
          message: 'Assessment is not active for this campaign.',
        },
      ],
    })
  })

  it('creates invitations and sends emails using the selected assessment name', async () => {
    const adminClient = createCreateAdminClient({
      campaign,
      insertedRows: [
        {
          id: 'inv-1',
          token: 'tok-1',
          email: 'ada@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          status: 'sent',
          assessment_id: 'assess-2',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })

    const result = await createPortalCampaignInvitations({
      adminClient: adminClient as never,
      organisationId: 'org-1',
      userId: 'user-1',
      campaignId: 'camp-1',
      portalBaseUrl: 'https://portal.example.com',
      payload: {
        send_now: true,
        invitations: [{ email: 'ada@example.com', assessment_id: 'assess-2', first_name: 'Ada' }],
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        invitations: [
          {
            id: 'inv-1',
            campaign_id: undefined,
            email: 'ada@example.com',
            assessment_id: 'assess-2',
            first_name: 'Ada',
            last_name: 'Lovelace',
            organisation: null,
            role: null,
            status: 'sent',
            sent_at: null,
            opened_at: null,
            started_at: null,
            completed_at: null,
            expires_at: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: null,
          },
        ],
        errors: undefined,
      },
    })
    expect(sendSurveyInvitationEmail).toHaveBeenCalledWith({
      to: 'ada@example.com',
      firstName: 'Ada',
      surveyName: 'LQ8',
      invitationUrl: 'https://portal.example.com/assess/i/tok-1',
    })
  })
})
