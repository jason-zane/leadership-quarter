import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/api-auth', () => ({
  requireDashboardApiAuth: vi.fn(),
}))
vi.mock('@/utils/services/admin-campaigns', () => ({
  getAdminCampaign: vi.fn(),
  updateAdminCampaign: vi.fn(),
  deleteAdminCampaign: vi.fn(),
  listAdminCampaignResponses: vi.fn(),
  addAdminCampaignAssessment: vi.fn(),
  addAdminCampaignFlowStep: vi.fn(),
  removeAdminCampaignAssessment: vi.fn(),
}))

import {
  DELETE as deleteCampaign,
  GET as getCampaign,
  PATCH as patchCampaign,
} from '@/app/api/admin/campaigns/[id]/route'
import { GET as getCampaignResponses } from '@/app/api/admin/campaigns/[id]/responses/route'
import {
  DELETE as deleteCampaignAssessment,
  POST as postCampaignAssessment,
} from '@/app/api/admin/campaigns/[id]/assessments/route'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  addAdminCampaignFlowStep,
  deleteAdminCampaign,
  getAdminCampaign,
  listAdminCampaignResponses,
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

describe('admin campaign workflow routes', () => {
  it('maps missing campaigns to 404', async () => {
    vi.mocked(getAdminCampaign).mockResolvedValue({
      ok: false,
      error: 'campaign_not_found',
    })

    const res = await getCampaign(new Request('http://localhost/api/admin/campaigns/c-1'), {
      params: Promise.resolve({ id: 'c-1' }),
    })

    expect(res.status).toBe(404)
  })

  it('maps invalid campaign updates to 400', async () => {
    vi.mocked(updateAdminCampaign).mockResolvedValue({
      ok: false,
      error: 'invalid_payload',
    })

    const res = await patchCampaign(
      new Request('http://localhost/api/admin/campaigns/c-1', {
        method: 'PATCH',
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('lists campaign responses', async () => {
    vi.mocked(listAdminCampaignResponses).mockResolvedValue({
      ok: true,
      data: {
        view: 'submissions',
        submissions: [{
          id: 'r-1',
          candidateKey: 'candidate-1',
          assessmentId: 'assess-1',
          assessmentName: 'AI Readiness',
          assessmentKey: 'ai-readiness',
          participantName: 'Ada Lovelace',
          email: 'ada@example.com',
          organisation: 'Org',
          role: 'Lead',
          status: 'completed',
          outcomeLabel: 'Leader',
          averageTraitScore: 3.5,
          submittedAt: '2026-01-01T00:00:00Z',
          completedAt: '2026-01-01T00:00:00Z',
          detailHref: '/dashboard/campaigns/c-1/responses/submissions/r-1',
          reportsHref: '/dashboard/campaigns/c-1/responses/submissions/r-1?tab=reports',
          currentReportHref: '/assess/r/assessment?access=tok',
          candidateHref: '/dashboard/campaigns/c-1/responses/candidates/candidate-1',
        }],
      },
    })

    const res = await getCampaignResponses(new Request('http://localhost/api/admin/campaigns/c-1/responses'), {
      params: Promise.resolve({ id: 'c-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.submissions).toHaveLength(1)
  })

  it('maps duplicate campaign assessment links to 409', async () => {
    vi.mocked(addAdminCampaignFlowStep).mockResolvedValue({
      ok: false,
      error: 'assessment_already_added',
    })

    const res = await postCampaignAssessment(
      new Request('http://localhost/api/admin/campaigns/c-1/assessments', {
        method: 'POST',
        body: JSON.stringify({ assessment_id: 'a-1' }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    )

    expect(res.status).toBe(409)
  })

  it('requires assessmentId on campaign assessment removal', async () => {
    const res = await deleteCampaignAssessment(
      new Request('http://localhost/api/admin/campaigns/c-1/assessments', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    )

    expect(res.status).toBe(400)
  })

  it('deletes campaign assessment links on success', async () => {
    vi.mocked(removeAdminCampaignAssessment).mockResolvedValue({ ok: true })

    const res = await deleteCampaignAssessment(
      new Request('http://localhost/api/admin/campaigns/c-1/assessments?assessmentId=ca-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'c-1' }) }
    )

    expect(res.status).toBe(200)
  })

  it('deletes campaigns on success', async () => {
    vi.mocked(deleteAdminCampaign).mockResolvedValue({ ok: true })

    const res = await deleteCampaign(new Request('http://localhost/api/admin/campaigns/c-1', {
      method: 'DELETE',
    }), {
      params: Promise.resolve({ id: 'c-1' }),
    })

    expect(res.status).toBe(200)
  })
})
