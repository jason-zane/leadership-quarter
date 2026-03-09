import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  exportPortalCampaignResponsesCsv,
  getPortalCampaignAnalytics,
  listPortalCampaignResponses,
} from '@/utils/services/portal-campaign-workspace'

function createWorkspaceAdminClient(options?: {
  campaign?: unknown
  submissions?: unknown[]
  submissionsError?: unknown
  invitations?: unknown[]
  invitationsError?: unknown
}) {
  const campaignQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.campaign ?? null,
      error: null,
    }),
  }

  let submissionsCalls = 0
  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') {
        return campaignQuery
      }
      if (table === 'assessment_invitations') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: options?.invitations ?? [],
            error: options?.invitationsError ?? null,
          }),
        }
      }
      if (table === 'assessment_submissions') {
        submissionsCalls += 1
        if (submissionsCalls === 1) {
          const query = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: options?.submissions ?? [],
              error: options?.submissionsError ?? null,
            }),
            then: (resolve: (value: { data: unknown[]; error: unknown }) => unknown) =>
              Promise.resolve({
                data: options?.submissions ?? [],
                error: options?.submissionsError ?? null,
              }).then(resolve),
          }
          return query
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: options?.submissions ?? [],
            error: options?.submissionsError ?? null,
          }),
        }
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPortalCampaignAnalytics', () => {
  it('returns not found when the campaign is outside the organisation', async () => {
    const result = await getPortalCampaignAnalytics({
      adminClient: createWorkspaceAdminClient() as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })
  })

  it('returns aggregated campaign analytics', async () => {
    const result = await getPortalCampaignAnalytics({
      adminClient: createWorkspaceAdminClient({
        campaign: { id: 'camp-1', name: 'Pilot', status: 'active' },
        invitations: [
          { id: 'inv-1', status: 'sent', sent_at: '2026-01-01', opened_at: '2026-01-02', started_at: null, completed_at: null },
          { id: 'inv-2', status: 'completed', sent_at: '2026-01-01', opened_at: '2026-01-03', started_at: '2026-01-03', completed_at: '2026-01-04' },
        ],
        submissions: [
          { id: 'sub-1', scores: { openness: 4, capability: 3 }, created_at: '2026-01-04T00:00:00Z' },
        ],
      }) as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        campaign: { id: 'camp-1', name: 'Pilot', status: 'active' },
        analytics: {
          totals: {
            invitations: 2,
            sent: 2,
            opened: 2,
            started: 1,
            completed: 1,
            submissions: 1,
          },
          rates: {
            open_rate: 100,
            start_rate: 50,
            completion_rate: 50,
          },
          scores: {
            average: 3.5,
            sample_size: 1,
          },
        },
      },
    })
  })
})

describe('listPortalCampaignResponses', () => {
  it('maps campaign submission rows for the portal UI', async () => {
    const result = await listPortalCampaignResponses({
      adminClient: createWorkspaceAdminClient({
        campaign: { id: 'camp-1' },
        submissions: [
          {
            id: 'sub-1',
            assessment_id: 'assess-1',
            created_at: '2026-01-04T00:00:00Z',
            demographics: { region: 'AU' },
            scores: { openness: 4, capability: 3 },
            classification: { label: 'Leader' },
            assessments: { id: 'assess-1', key: 'ai', name: 'AI' },
            assessment_invitations: {
              status: 'completed',
              completed_at: '2026-01-04T00:00:00Z',
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
              organisation: 'Analytical Engines',
              role: 'Lead',
            },
          },
        ],
      }) as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        responses: [
          {
            id: 'sub-1',
            assessment_id: 'assess-1',
            status: 'completed',
            score: 3.5,
            classification_label: 'Leader',
            created_at: '2026-01-04T00:00:00Z',
            completed_at: '2026-01-04T00:00:00Z',
            demographics: { region: 'AU' },
            assessments: { id: 'assess-1', key: 'ai', name: 'AI' },
            assessment_invitations: {
              first_name: 'Ada',
              last_name: 'Lovelace',
              email: 'ada@example.com',
              organisation: 'Analytical Engines',
              role: 'Lead',
            },
          },
        ],
      },
    })
  })
})

describe('exportPortalCampaignResponsesCsv', () => {
  it('returns not found when the campaign is outside the organisation', async () => {
    const result = await exportPortalCampaignResponsesCsv({
      adminClient: createWorkspaceAdminClient() as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })
  })

  it('returns a csv export with escaped json fields', async () => {
    const result = await exportPortalCampaignResponsesCsv({
      adminClient: createWorkspaceAdminClient({
        campaign: { id: 'camp-1', slug: 'pilot' },
        submissions: [
          {
            id: 'sub-1',
            assessment_id: 'assess-1',
            created_at: '2026-01-04T00:00:00Z',
            scores: { openness: 4 },
            bands: { openness: 'High' },
            classification: { label: 'Leader' },
            recommendations: ['Do more'],
            demographics: { region: 'AU' },
            assessments: { name: 'AI Readiness', key: 'ai' },
            assessment_invitations: {
              email: 'ada@example.com',
              first_name: 'Ada',
              last_name: 'Lovelace',
              organisation: 'Analytical Engines',
              role: 'Lead',
              completed_at: '2026-01-04T00:00:00Z',
            },
          },
        ],
      }) as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.filename).toBe('campaign-pilot-responses.csv')
      expect(result.data.csv).toContain('submission_id,assessment_id,assessment_key')
      expect(result.data.csv).toContain('sub-1,assess-1,ai,AI Readiness,ada@example.com,Ada,Lovelace')
      expect(result.data.csv).toContain('"{""openness"":4}"')
      expect(result.data.csv).toContain('"{""label"":""Leader""}"')
    }
  })
})
