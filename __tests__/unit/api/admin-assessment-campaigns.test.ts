import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/admin-assessment-campaigns', () => ({
  listAdminAssessmentCampaigns: vi.fn(),
}))
vi.mock('@/utils/services/admin-campaigns', () => ({
  updateAdminCampaign: vi.fn(),
  removeAdminCampaignAssessment: vi.fn(),
  deleteAdminCampaign: vi.fn(),
}))

import { GET as getAssessmentCampaigns } from '@/app/api/admin/assessments/[id]/campaigns/route'
import {
  DELETE as deleteAssessmentCampaign,
  PATCH as patchAssessmentCampaign,
} from '@/app/api/admin/assessments/[id]/campaigns/[campaignId]/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { listAdminAssessmentCampaigns } from '@/utils/services/admin-assessment-campaigns'
import {
  deleteAdminCampaign,
  removeAdminCampaignAssessment,
  updateAdminCampaign,
} from '@/utils/services/admin-campaigns'

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'admin-user' },
    role: 'admin' as const,
    adminClient: {},
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireDashboardApiAuth).mockResolvedValue(makeAuthSuccess() as never)
})

describe('admin assessment campaigns routes', () => {
  it('lists linked campaigns', async () => {
    vi.mocked(listAdminAssessmentCampaigns).mockResolvedValue({
      ok: true,
      data: {
        campaigns: [
          {
            id: 'campaign-1',
            campaignAssessmentId: 'ca-1',
            name: 'Campaign One',
            external_name: 'Campaign One',
            slug: 'campaign-one',
            status: 'active',
            organisation_id: null,
            owner_scope: 'lq',
            owner_label: 'Leadership Quarter',
            organisations: null,
            is_active: true,
            flow_position_label: 'Assessment 1 of 1',
            flow_detail: 'No interstitial screens in the current flow',
            response_count: 3,
            can_shadow_preview: true,
            shadow_preview_url: '/assess/c/leadership-quarter/campaign-one',
          },
        ],
      },
    })

    const res = await getAssessmentCampaigns(new Request('http://localhost/api/admin/assessments/a-1/campaigns'), {
      params: Promise.resolve({ id: 'a-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.campaigns).toHaveLength(1)
  })

  it('maps invalid campaign status updates to 400', async () => {
    vi.mocked(updateAdminCampaign).mockResolvedValue({
      ok: false,
      error: 'invalid_payload',
    })

    const res = await patchAssessmentCampaign(
      new Request('http://localhost/api/admin/assessments/a-1/campaigns/c-1', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ id: 'a-1', campaignId: 'c-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('requires campaignAssessmentId when detaching an assessment', async () => {
    const res = await deleteAssessmentCampaign(
      new Request('http://localhost/api/admin/assessments/a-1/campaigns/c-1', {
        method: 'DELETE',
        body: JSON.stringify({ mode: 'detach' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'a-1', campaignId: 'c-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('detaches the assessment from a campaign on success', async () => {
    vi.mocked(removeAdminCampaignAssessment).mockResolvedValue({ ok: true })

    const res = await deleteAssessmentCampaign(
      new Request('http://localhost/api/admin/assessments/a-1/campaigns/c-1', {
        method: 'DELETE',
        body: JSON.stringify({ mode: 'detach', campaignAssessmentId: 'ca-1' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'a-1', campaignId: 'c-1' }) }
    )

    expect(res.status).toBe(200)
  })

  it('maps campaign delete conflicts to 409', async () => {
    vi.mocked(deleteAdminCampaign).mockResolvedValue({
      ok: false,
      error: 'campaign_has_activity',
    })

    const res = await deleteAssessmentCampaign(
      new Request('http://localhost/api/admin/assessments/a-1/campaigns/c-1', {
        method: 'DELETE',
        body: JSON.stringify({ mode: 'campaign' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'a-1', campaignId: 'c-1' }) }
    )

    expect(res.status).toBe(409)
  })
})
