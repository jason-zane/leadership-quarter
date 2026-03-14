import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addAdminCampaignAssessment,
  createAdminCampaign,
  listAdminCampaignResponses,
  updateAdminCampaign,
} from '@/utils/services/admin-campaigns'

function createCampaignServiceClient(options?: {
  campaignsList?: unknown[]
  campaignInsertRow?: unknown
  campaignInsertError?: { code?: string; message: string } | null
  campaignConfig?: unknown
  campaignUpdateRow?: unknown
  campaignUpdateError?: { code?: string; message: string } | null
  assessmentInsertError?: { code?: string; message: string } | null
  assessmentInsertRow?: unknown
  flowStepsInsertError?: { message: string } | null
  submissions?: unknown[]
  submissionsError?: { message: string } | null
  sessionScores?: unknown[]
  traitScores?: unknown[]
}) {
  const campaignsTable = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.campaignsList ?? [],
      error: null,
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data:
            options?.campaignInsertRow ??
            {
              id: 'c-1',
              name: 'Campaign',
              external_name: 'Campaign',
              slug: 'campaign',
              status: 'draft',
              config: {},
              created_at: '',
            },
          error: options?.campaignInsertError ?? null,
        }),
      }),
    }),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        config: options?.campaignConfig ?? { demographics_enabled: true, demographics_fields: ['job_level'] },
        external_name: 'Campaign',
      },
      error: null,
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data:
              options?.campaignUpdateRow ??
              {
                id: 'c-1',
                name: 'Campaign',
                external_name: 'Campaign',
                slug: 'campaign',
                status: 'active',
                config: {},
                runner_overrides: {},
                updated_at: '',
              },
            error: options?.campaignUpdateError ?? null,
          }),
        }),
      }),
    }),
  }

  const campaignAssessmentsTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'ca-1',
          sort_order: 0,
        },
        {
          id: 'ca-2',
          sort_order: 1,
        },
      ],
      error: null,
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data:
            options?.assessmentInsertRow ??
            {
              id: 'ca-1',
              campaign_id: 'c-1',
              assessment_id: 'a-1',
              sort_order: 0,
              is_active: true,
              created_at: '',
            },
          error: options?.assessmentInsertError ?? null,
        }),
      }),
    }),
  }

  const campaignFlowStepsTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [],
      error: null,
    }),
    insert: vi.fn().mockResolvedValue({
      data: null,
      error: options?.flowStepsInsertError ?? null,
    }),
  }

  const submissionsTable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.submissions ?? [],
      error: options?.submissionsError ?? null,
    }),
  }

  const sessionScoresTable = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.sessionScores ?? [],
      error: null,
    }),
  }

  const traitScoresTable = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: options?.traitScores ?? [],
      error: null,
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') return campaignsTable
      if (table === 'campaign_assessments') return campaignAssessmentsTable
      if (table === 'campaign_flow_steps') return campaignFlowStepsTable
      if (table === 'assessment_submissions') return submissionsTable
      if (table === 'session_scores') return sessionScoresTable
      if (table === 'trait_scores') return traitScoresTable
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createAdminCampaign', () => {
  it('rejects invalid slugs', async () => {
    const result = await createAdminCampaign({
      adminClient: createCampaignServiceClient() as never,
      userId: 'user-1',
      payload: {
        name: 'Campaign',
        external_name: '!!!',
      },
    })

    expect(result).toEqual({ ok: false, error: 'invalid_slug' })
  })

  it('links assessments after campaign creation', async () => {
    const adminClient = createCampaignServiceClient()

    const result = await createAdminCampaign({
      adminClient: adminClient as never,
      userId: 'user-1',
      payload: {
        name: 'Campaign',
        external_name: 'External Campaign Name',
        assessment_ids: ['a-1', 'a-2'],
      },
    })

    expect(result.ok).toBe(true)
    const campaignsTable = adminClient.from('campaigns') as {
      insert: ReturnType<typeof vi.fn>
    }
    expect(campaignsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'external-campaign-name',
      })
    )
    expect(adminClient.from).toHaveBeenCalledWith('campaign_assessments')
  })
})

describe('updateAdminCampaign', () => {
  it('merges config updates and clears demographics fields when disabled', async () => {
    const adminClient = createCampaignServiceClient({
      campaignConfig: {
        registration_position: 'before',
        report_access: 'immediate',
        demographics_enabled: true,
        demographics_fields: ['job_level'],
      },
    })

    const result = await updateAdminCampaign({
      adminClient: adminClient as never,
      campaignId: 'c-1',
      payload: {
        config: {
          demographics_enabled: false,
        },
      },
    })

    expect(result.ok).toBe(true)
    const campaignsTable = adminClient.from('campaigns') as {
      update: ReturnType<typeof vi.fn>
    }
    expect(campaignsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          demographics_enabled: false,
          demographics_fields: [],
        }),
      })
    )
  })

  it('updates the slug when the external name changes', async () => {
    const adminClient = createCampaignServiceClient()

    const result = await updateAdminCampaign({
      adminClient: adminClient as never,
      campaignId: 'c-1',
      payload: {
        external_name: 'Renamed External Campaign',
      },
    })

    expect(result.ok).toBe(true)
    const campaignsTable = adminClient.from('campaigns') as {
      update: ReturnType<typeof vi.fn>
    }
    expect(campaignsTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        external_name: 'Renamed External Campaign',
        slug: 'renamed-external-campaign',
      })
    )
  })
})

describe('listAdminCampaignResponses', () => {
  it('maps submission rows in the default submissions view', async () => {
    const result = await listAdminCampaignResponses({
      adminClient: createCampaignServiceClient({
        submissions: [
          {
            id: 'sub-1',
            assessment_id: 'a-1',
            created_at: '2026-01-01T00:00:00Z',
            demographics: { job_level: 'director' },
            scores: { strategy: 4, execution: 3 },
            assessments: { id: 'a-1', key: 'ai', name: 'AI Readiness' },
            assessment_invitations: {
              status: 'completed',
              completed_at: '2026-01-02T00:00:00Z',
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
              organisation: 'Analytical Engines',
              role: 'Lead',
            },
          },
        ],
        sessionScores: [
          {
            id: 'session-1',
            submission_id: 'sub-1',
            computed_at: '2026-01-02T00:00:00Z',
          },
        ],
        traitScores: [
          { session_score_id: 'session-1', raw_score: 4 },
          { session_score_id: 'session-1', raw_score: 3 },
        ],
      }) as never,
      campaignId: 'c-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        view: 'submissions',
        submissions: [
          expect.objectContaining({
            id: 'sub-1',
            status: 'completed',
            averageTraitScore: 3.5,
            outcomeLabel: null,
            email: 'ada@example.com',
            participantName: 'Ada Lovelace',
            assessmentName: 'AI Readiness',
            detailHref: '/dashboard/campaigns/c-1/responses/submissions/sub-1',
            reportsHref: '/dashboard/campaigns/c-1/responses/submissions/sub-1?tab=reports',
          }),
        ],
      },
    })
  })

  it('can group candidate journeys', async () => {
    const result = await listAdminCampaignResponses({
      adminClient: createCampaignServiceClient({
        submissions: [
          {
            id: 'sub-1',
            invitation_id: 'inv-1',
            assessment_id: 'a-1',
            created_at: '2026-01-01T00:00:00Z',
            scores: { strategy: 4, execution: 3 },
            assessments: { id: 'a-1', key: 'ai', name: 'AI Readiness' },
            assessment_invitations: {
              status: 'completed',
              completed_at: '2026-01-02T00:00:00Z',
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
              organisation: 'Analytical Engines',
              role: 'Lead',
            },
          },
        ],
        sessionScores: [
          {
            id: 'session-1',
            submission_id: 'sub-1',
            computed_at: '2026-01-02T00:00:00Z',
          },
        ],
        traitScores: [
          { session_score_id: 'session-1', raw_score: 4 },
          { session_score_id: 'session-1', raw_score: 3 },
        ],
      }) as never,
      campaignId: 'c-1',
      filters: {
        view: 'candidates',
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        view: 'candidates',
        candidates: [
          expect.objectContaining({
            participantName: 'Ada Lovelace',
            email: 'ada@example.com',
            submissionCount: 1,
          }),
        ],
      },
    })
  })
})

describe('addAdminCampaignAssessment', () => {
  it('returns duplicate assessment errors', async () => {
    const result = await addAdminCampaignAssessment({
      adminClient: createCampaignServiceClient({
        assessmentInsertError: { code: '23505', message: 'duplicate' },
      }) as never,
      campaignId: 'c-1',
      payload: {
        assessment_id: 'a-1',
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'assessment_already_added',
    })
  })
})
