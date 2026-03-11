import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/security/report-access', () => ({
  createReportAccessToken: vi.fn(),
}))
vi.mock('@/utils/services/submission-report-options', () => ({
  getSubmissionReportOptions: vi.fn(),
}))

import {
  getPortalParticipantResult,
  listPortalParticipants,
  parsePortalParticipantsQuery,
} from '@/utils/services/portal-participants'
import { createReportAccessToken } from '@/utils/security/report-access'
import { getSubmissionReportOptions } from '@/utils/services/submission-report-options'

function createAdminClientMock(options?: {
  campaigns?: unknown[]
  campaignSearchRows?: unknown[]
  assessmentAccess?: unknown[]
  submissions?: unknown[]
  submissionCount?: number
  submission?: unknown
  campaign?: unknown
  campaignError?: unknown
  assessmentAccessError?: unknown
  invitationSearchError?: unknown
  submissionError?: unknown
}) {
  const campaignsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: options?.campaigns ?? [], error: options?.campaignError ?? null }),
  }
  const assessmentAccessQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }
  assessmentAccessQuery.eq
    .mockReturnValueOnce(assessmentAccessQuery)
    .mockReturnValueOnce(
      Promise.resolve({
        data: options?.assessmentAccess ?? [],
        error: options?.assessmentAccessError ?? null,
      })
    )

  const invitationSearchQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: options?.campaignSearchRows ?? [],
      error: options?.invitationSearchError ?? null,
    }),
  }
  const submissionListQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data: options?.submissions ?? [],
      error: options?.submissionError ?? null,
      count: options?.submissionCount ?? 0,
    }),
  }
  const submissionDetailQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.submission ?? null,
      error: options?.submissionError ?? null,
    }),
  }
  const campaignDetailQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.campaign ?? null,
      error: null,
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') {
        if (options?.submission !== undefined || options?.campaign !== undefined) {
          return campaignDetailQuery
        }
        return campaignsQuery
      }
      if (table === 'organisation_assessment_access') return assessmentAccessQuery
      if (table === 'assessment_invitations') return invitationSearchQuery
      if (table === 'assessment_submissions') {
        if (options?.submission !== undefined) return submissionDetailQuery
        return submissionListQuery
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createReportAccessToken).mockReturnValue('report-token')
  vi.mocked(getSubmissionReportOptions).mockResolvedValue([
    {
      key: 'frozen_default',
      label: 'Default at completion',
      description: 'Snapshot',
      selectionMode: 'frozen_default',
      reportVariantId: 'variant-1',
      currentDefault: true,
      accessToken: 'report-token',
    },
  ])
})

describe('parsePortalParticipantsQuery', () => {
  it('normalizes search params and bounds page size', () => {
    const params = new URLSearchParams({
      q: ' Ada ',
      campaign_id: 'camp-1',
      assessment_id: 'assess-1',
      page: '2',
      pageSize: '500',
    })

    expect(parsePortalParticipantsQuery(params)).toEqual({
      q: 'ada',
      campaignId: 'camp-1',
      assessmentId: 'assess-1',
      page: 2,
      pageSize: 100,
    })
  })
})

describe('listPortalParticipants', () => {
  it('returns forbidden for campaigns outside the organisation', async () => {
    const result = await listPortalParticipants({
      adminClient: createAdminClientMock({
        campaigns: [{ id: 'camp-1', name: 'Campaign' }],
        assessmentAccess: [],
      }) as never,
      organisationId: 'org-1',
      filters: {
        q: '',
        campaignId: 'camp-2',
        assessmentId: '',
        page: 1,
        pageSize: 25,
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'forbidden',
      message: 'Campaign does not belong to your organisation.',
    })
  })

  it('returns mapped participant rows', async () => {
    const result = await listPortalParticipants({
      adminClient: createAdminClientMock({
        campaigns: [{ id: 'camp-1', name: 'Campaign' }],
        assessmentAccess: [{ assessments: { id: 'assess-1', key: 'ai', name: 'AI' } }],
        submissions: [
          {
            id: 'sub-1',
            campaign_id: 'camp-1',
            assessment_id: 'assess-1',
            created_at: '2026-01-01T00:00:00Z',
            scores: { openness: 4, risk: 3 },
            classification: { label: 'Leader' },
            assessments: { id: 'assess-1', key: 'ai', name: 'AI' },
            assessment_invitations: {
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
              completed_at: '2026-01-02T00:00:00Z',
            },
          },
        ],
        submissionCount: 1,
      }) as never,
      organisationId: 'org-1',
      filters: {
        q: '',
        campaignId: '',
        assessmentId: '',
        page: 1,
        pageSize: 25,
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        participants: [
          expect.objectContaining({
            submission_id: 'sub-1',
            participant_name: 'Ada Lovelace',
            email: 'ada@example.com',
            classification_label: 'Leader',
            summary_score: 3.5,
          }),
        ],
        filters: {
          campaigns: [{ id: 'camp-1', name: 'Campaign' }],
          assessments: [{ id: 'assess-1', key: 'ai', name: 'AI' }],
        },
        pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      },
    })
  })
})

describe('getPortalParticipantResult', () => {
  it('returns not found when the campaign is outside the organisation', async () => {
    const result = await getPortalParticipantResult({
      adminClient: createAdminClientMock({
        submission: { id: 'sub-1', campaign_id: 'camp-1' },
        campaign: null,
      }) as never,
      organisationId: 'org-1',
      submissionId: 'sub-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'not_found',
      message: 'Participant result was not found.',
    })
  })

  it('returns the portal participant detail payload', async () => {
    const result = await getPortalParticipantResult({
      adminClient: createAdminClientMock({
        submission: {
          id: 'sub-1',
          campaign_id: 'camp-1',
          assessment_id: 'assess-1',
          created_at: '2026-01-01T00:00:00Z',
          scores: { openness: 4 },
          bands: { openness: 'High' },
          classification: { key: 'leader', label: 'Leader' },
          recommendations: ['Do more'],
          demographics: { region: 'AU' },
          assessments: { id: 'assess-1', key: 'ai', name: 'AI' },
          assessment_invitations: {
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
            organisation: 'Org',
            role: 'Lead',
            status: 'completed',
            completed_at: '2026-01-02T00:00:00Z',
          },
        },
        campaign: { id: 'camp-1', name: 'Campaign', slug: 'campaign' },
      }) as never,
      organisationId: 'org-1',
      submissionId: 'sub-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        result: expect.objectContaining({
          id: 'sub-1',
          campaign: { id: 'camp-1', name: 'Campaign', slug: 'campaign' },
          reportOptions: [
            expect.objectContaining({
              key: 'frozen_default',
              accessToken: 'report-token',
            }),
          ],
          classification: { key: 'leader', label: 'Leader' },
        }),
      },
    })
  })
})
