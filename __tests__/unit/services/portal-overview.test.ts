import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPortalOverview } from '@/utils/services/portal-overview'

function createAdminClientMock(options?: {
  campaigns?: unknown[]
  campaignsError?: unknown
  invitations?: unknown[]
  invitationError?: unknown
  submissions?: unknown[]
  submissionError?: unknown
  submissionCount?: number
  submissionCountError?: unknown
}) {
  const campaignsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.campaigns ?? [],
      error: options?.campaignsError ?? null,
    }),
  }
  const invitationsQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: options?.invitations ?? [],
      error: options?.invitationError ?? null,
    }),
  }
  const submissionsListQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: options?.submissions ?? [],
      error: options?.submissionError ?? null,
    }),
  }
  const submissionsCountQuery = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      count: options?.submissionCount ?? 0,
      error: options?.submissionCountError ?? null,
    }),
  }

  let assessmentSubmissionsCalls = 0
  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') return campaignsQuery
      if (table === 'assessment_invitations') return invitationsQuery
      if (table === 'assessment_submissions') {
        assessmentSubmissionsCalls += 1
        return assessmentSubmissionsCalls === 1 ? submissionsListQuery : submissionsCountQuery
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPortalOverview', () => {
  it('returns an internal error when campaigns cannot be loaded', async () => {
    const result = await getPortalOverview({
      adminClient: createAdminClientMock({ campaignsError: new Error('boom') }) as never,
      organisationId: 'org-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'internal_error',
      message: 'Failed to load portal overview.',
    })
  })

  it('returns empty metrics when the organisation has no campaigns', async () => {
    const result = await getPortalOverview({
      adminClient: createAdminClientMock({ campaigns: [] }) as never,
      organisationId: 'org-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        metrics: {
          campaigns_total: 0,
          campaigns_active: 0,
          invitations_total: 0,
          submissions_total: 0,
          average_score: null,
        },
        campaigns_by_status: {
          draft: 0,
          active: 0,
          closed: 0,
          archived: 0,
        },
        recent_results: [],
      },
    })
  })

  it('returns partial overview when downstream queries fail', async () => {
    const result = await getPortalOverview({
      adminClient: createAdminClientMock({
        campaigns: [{ id: 'camp-1', name: 'Pilot', status: 'active' }],
        invitationError: new Error('boom'),
      }) as never,
      organisationId: 'org-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        warning: 'partial_overview',
        metrics: {
          campaigns_total: 1,
          campaigns_active: 1,
          invitations_total: 0,
          submissions_total: 0,
          average_score: null,
        },
        campaigns_by_status: {
          draft: 0,
          active: 1,
          closed: 0,
          archived: 0,
        },
        recent_results: [],
      },
    })
  })

  it('returns aggregated overview metrics and recent results', async () => {
    const result = await getPortalOverview({
      adminClient: createAdminClientMock({
        campaigns: [{ id: 'camp-1', name: 'Pilot', status: 'active' }],
        invitations: [{ id: 'inv-1' }, { id: 'inv-2' }],
        submissions: [
          {
            id: 'sub-1',
            campaign_id: 'camp-1',
            created_at: '2026-01-01T00:00:00Z',
            scores: { openness: 4, capability: 3 },
            classification: { label: 'Leader' },
            assessments: { id: 'assess-1', key: 'ai', name: 'AI' },
            assessment_invitations: {
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
            },
          },
        ],
        submissionCount: 1,
      }) as never,
      organisationId: 'org-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        metrics: {
          campaigns_total: 1,
          campaigns_active: 1,
          invitations_total: 2,
          submissions_total: 1,
          average_score: 3.5,
        },
        campaigns_by_status: {
          draft: 0,
          active: 1,
          closed: 0,
          archived: 0,
        },
        recent_results: [
          {
            submission_id: 'sub-1',
            campaign_id: 'camp-1',
            campaign_name: 'Pilot',
            participant_name: 'Ada Lovelace',
            email: 'ada@example.com',
            assessment: { id: 'assess-1', key: 'ai', name: 'AI' },
            classification_label: 'Leader',
            summary_score: 3.5,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
    })
  })
})
