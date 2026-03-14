import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/assessment-runtime-v2', () => ({
  getAssessmentV2Readiness: vi.fn(),
}))

import { listAdminAssessmentCampaigns } from '@/utils/services/admin-assessment-campaigns'
import { getAssessmentV2Readiness } from '@/utils/services/assessment-runtime-v2'

function createAdminClient(options?: {
  flowStepsError?: { message?: string; details?: string | null; hint?: string | null } | null
}) {
  const campaignAssessmentsQuery = {
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'ca-1',
          campaign_id: 'campaign-1',
          assessment_id: 'assessment-1',
          sort_order: 0,
          is_active: true,
          created_at: '2026-03-14T00:00:00.000Z',
          campaigns: {
            id: 'campaign-1',
            organisation_id: 'org-1',
            name: 'Client campaign',
            external_name: 'Client campaign public',
            slug: 'client-campaign',
            status: 'active',
            created_at: '2026-03-14T00:00:00.000Z',
            updated_at: '2026-03-14T00:00:00.000Z',
            organisations: {
              id: 'org-1',
              name: 'Acme',
              slug: 'acme',
            },
          },
        },
      ],
      error: null,
    }),
  }

  const flowStepsQuery = {
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: options?.flowStepsError
        ? null
        : [
            {
              id: 'step-screen',
              campaign_id: 'campaign-1',
              step_type: 'screen',
              sort_order: 0,
              is_active: true,
              campaign_assessment_id: null,
            },
            {
              id: 'step-assessment',
              campaign_id: 'campaign-1',
              step_type: 'assessment',
              sort_order: 1,
              is_active: true,
              campaign_assessment_id: 'ca-1',
            },
          ],
      error: options?.flowStepsError ?? null,
    }),
  }

  const submissionsQuery = {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: [
        { campaign_id: 'campaign-1' },
        { campaign_id: 'campaign-1' },
      ],
      error: null,
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'campaign_assessments') {
        return {
          select: vi.fn().mockReturnValue(campaignAssessmentsQuery),
        }
      }

      if (table === 'campaign_flow_steps') {
        return {
          select: vi.fn().mockReturnValue(flowStepsQuery),
        }
      }

      if (table === 'assessment_submissions') {
        return {
          select: vi.fn().mockReturnValue(submissionsQuery),
        }
      }

      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAssessmentV2Readiness).mockResolvedValue({
    checks: [],
    readyCount: 0,
    totalCount: 0,
    canPreview: true,
    canCutover: false,
    issues: [],
    linkedCampaignCount: 1,
    submissionCount: 2,
    publishedReportCount: 1,
  })
})

describe('listAdminAssessmentCampaigns', () => {
  it('builds campaign rows with flow summaries and response counts', async () => {
    const result = await listAdminAssessmentCampaigns({
      adminClient: createAdminClient() as never,
      assessmentId: 'assessment-1',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.campaigns).toEqual([
      expect.objectContaining({
        id: 'campaign-1',
        owner_scope: 'client',
        owner_label: 'Acme',
        flow_position_label: 'Step 2 of 2',
        flow_detail: 'Assessment 1 of 1',
        response_count: 2,
        can_shadow_preview: true,
      }),
    ])
  })

  it('falls back to legacy assessment ordering when flow steps are unavailable', async () => {
    const result = await listAdminAssessmentCampaigns({
      adminClient: createAdminClient({
        flowStepsError: {
          message: 'relation "campaign_flow_steps" does not exist',
        },
      }) as never,
      assessmentId: 'assessment-1',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.campaigns[0]?.flow_position_label).toBe('Assessment 1 of 1')
    expect(result.data.campaigns[0]?.flow_detail).toBe('Legacy campaign ordering')
  })
})
