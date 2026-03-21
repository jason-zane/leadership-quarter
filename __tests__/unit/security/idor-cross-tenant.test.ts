/**
 * Red-Team Phase 3.1 — IDOR (Cross-Tenant Data Access) Tests
 *
 * Verifies that all portal routes scope data access by organisationId,
 * ensuring that a user in Org A cannot access campaigns/submissions in Org B.
 *
 * Phase 3.2 — Privilege Escalation Tests
 *
 * Verifies that role-based access control is enforced:
 * - Viewer cannot write (PATCH campaign)
 * - Portal user cannot access admin routes
 * - Staff cannot access admin-only routes
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

// ──────────────────────────────────────────
// Mock all auth + service dependencies
// ──────────────────────────────────────────

vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))
vi.mock('@/utils/assessments/api-auth', () => ({ requireDashboardApiAuth: vi.fn() }))
vi.mock('@/utils/services/portal-campaign-workspace', () => ({
  listPortalCampaignResponses: vi.fn(),
  getPortalCampaignAnalytics: vi.fn(),
  exportPortalCampaignResponsesCsv: vi.fn(),
}))
vi.mock('@/utils/services/portal-campaign-detail', () => ({
  getPortalCampaignDetail: vi.fn(),
  updatePortalCampaign: vi.fn(),
}))
vi.mock('@/utils/services/portal-participants', () => ({
  getPortalParticipantResult: vi.fn(),
  listPortalParticipants: vi.fn(),
  parsePortalParticipantsQuery: vi.fn(),
}))
vi.mock('@/utils/assessments/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, limit: 12, reset: 0 }),
}))
vi.mock('@/utils/services/platform-settings-runtime', () => ({
  rateLimitFor: vi.fn().mockReturnValue(60),
}))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getRateLimitHeaders: vi.fn().mockReturnValue({}),
  logRateLimitExceededForRequest: vi.fn(),
}))

import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  listPortalCampaignResponses,
  getPortalCampaignAnalytics,
  exportPortalCampaignResponsesCsv,
} from '@/utils/services/portal-campaign-workspace'
import {
  getPortalCampaignDetail,
  updatePortalCampaign,
} from '@/utils/services/portal-campaign-detail'
import { getPortalParticipantResult } from '@/utils/services/portal-participants'

import { GET as getResponses } from '@/app/api/portal/campaigns/[id]/responses/route'
import { GET as getAnalytics } from '@/app/api/portal/campaigns/[id]/analytics/route'
import { GET as getExports } from '@/app/api/portal/campaigns/[id]/exports/route'
import { GET as getCampaignDetail, PATCH as patchCampaign } from '@/app/api/portal/campaigns/[id]/route'
import { GET as getParticipantResult } from '@/app/api/portal/participants/[submissionId]/route'

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

const ORG_A = 'org-aaa-1111'
const CAMPAIGN_ORG_B = 'camp-bbb-001'
const SUBMISSION_ORG_B = 'sub-bbb-001'

function makeAuthForOrg(orgId: string, role: string = 'org_admin') {
  return {
    ok: true as const,
    user: { id: 'user-1', email: 'user@example.com' },
    context: {
      organisationId: orgId,
      organisationSlug: orgId === ORG_A ? 'acme' : 'globex',
      role,
      isBypassAdmin: false,
    },
    adminClient: {},
  }
}

function makeAuthFailure(status: number, error: string) {
  return {
    ok: false as const,
    response: NextResponse.json({ ok: false, error }, { status }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ──────────────────────────────────────────────────────────────
// 3.1 — IDOR: Cross-Tenant Data Access
//
// For each route: authenticate as Org A, supply resource IDs
// from Org B. Service layer should return not_found because the
// campaign/submission doesn't match the authenticated org.
// ──────────────────────────────────────────────────────────────

describe('Phase 3.1 — IDOR: Cross-Tenant Campaign Access', () => {
  beforeEach(() => {
    // User is authenticated in Org A
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthForOrg(ORG_A) as never)
  })

  it('GET /api/portal/campaigns/[id]/responses — Org A user cannot read Org B campaign responses', async () => {
    vi.mocked(listPortalCampaignResponses).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await getResponses(
      new Request(`http://localhost/api/portal/campaigns/${CAMPAIGN_ORG_B}/responses`),
      { params: Promise.resolve({ id: CAMPAIGN_ORG_B }) }
    )

    expect(res.status).toBe(404)
    // Verify the service was called with Org A's ID, not Org B's
    expect(listPortalCampaignResponses).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: ORG_A, campaignId: CAMPAIGN_ORG_B })
    )
  })

  it('GET /api/portal/campaigns/[id]/analytics — Org A user cannot read Org B campaign analytics', async () => {
    vi.mocked(getPortalCampaignAnalytics).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await getAnalytics(
      new Request(`http://localhost/api/portal/campaigns/${CAMPAIGN_ORG_B}/analytics`),
      { params: Promise.resolve({ id: CAMPAIGN_ORG_B }) }
    )

    expect(res.status).toBe(404)
    expect(getPortalCampaignAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: ORG_A, campaignId: CAMPAIGN_ORG_B })
    )
  })

  it('GET /api/portal/campaigns/[id] — Org A user cannot read Org B campaign detail', async () => {
    vi.mocked(getPortalCampaignDetail).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await getCampaignDetail(
      new Request(`http://localhost/api/portal/campaigns/${CAMPAIGN_ORG_B}`),
      { params: Promise.resolve({ id: CAMPAIGN_ORG_B }) }
    )

    expect(res.status).toBe(404)
    expect(getPortalCampaignDetail).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: ORG_A, campaignId: CAMPAIGN_ORG_B })
    )
  })

  it('PATCH /api/portal/campaigns/[id] — Org A user cannot modify Org B campaign', async () => {
    vi.mocked(updatePortalCampaign).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await patchCampaign(
      new Request(`http://localhost/api/portal/campaigns/${CAMPAIGN_ORG_B}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      }),
      { params: Promise.resolve({ id: CAMPAIGN_ORG_B }) }
    )

    expect(res.status).toBe(404)
    expect(updatePortalCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: ORG_A, campaignId: CAMPAIGN_ORG_B })
    )
  })

  it('GET /api/portal/campaigns/[id]/exports — Org A user cannot export Org B campaign data', async () => {
    vi.mocked(exportPortalCampaignResponsesCsv).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })

    const res = await getExports(
      new Request(`http://localhost/api/portal/campaigns/${CAMPAIGN_ORG_B}/exports`),
      { params: Promise.resolve({ id: CAMPAIGN_ORG_B }) }
    )

    expect(res.status).toBe(404)
    expect(exportPortalCampaignResponsesCsv).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: ORG_A, campaignId: CAMPAIGN_ORG_B })
    )
  })

  it('GET /api/portal/participants/[submissionId] — Org A user cannot view Org B submission', async () => {
    vi.mocked(getPortalParticipantResult).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Participant result was not found.',
    })

    const res = await getParticipantResult(
      new Request(`http://localhost/api/portal/participants/${SUBMISSION_ORG_B}`),
      { params: Promise.resolve({ submissionId: SUBMISSION_ORG_B }) }
    )

    expect(res.status).toBe(404)
    expect(getPortalParticipantResult).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: ORG_A, submissionId: SUBMISSION_ORG_B })
    )
  })
})

describe('Phase 3.1 — IDOR: Organisation ID always comes from auth context, not request', () => {
  it('all portal routes pass auth.context.organisationId to service — never from URL params', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthForOrg(ORG_A) as never)
    vi.mocked(listPortalCampaignResponses).mockResolvedValue({
      ok: true,
      data: { responses: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 } },
    } as never)
    vi.mocked(getPortalCampaignAnalytics).mockResolvedValue({
      ok: true,
      data: { analytics: {} },
    } as never)

    await getResponses(
      new Request(`http://localhost/api/portal/campaigns/any-id/responses`),
      { params: Promise.resolve({ id: 'any-id' }) }
    )
    await getAnalytics(
      new Request(`http://localhost/api/portal/campaigns/any-id/analytics`),
      { params: Promise.resolve({ id: 'any-id' }) }
    )

    // Both services received ORG_A from auth context, regardless of URL
    expect(vi.mocked(listPortalCampaignResponses).mock.calls[0]![0]).toHaveProperty('organisationId', ORG_A)
    expect(vi.mocked(getPortalCampaignAnalytics).mock.calls[0]![0]).toHaveProperty('organisationId', ORG_A)
  })
})

// ──────────────────────────────────────────────────────────────
// 3.2 — Privilege Escalation
// ──────────────────────────────────────────────────────────────

describe('Phase 3.2 — Privilege Escalation: Viewer cannot write', () => {
  it('PATCH /api/portal/campaigns/[id] — viewer role is rejected with 403', async () => {
    // requirePortalApiAuth with allowedRoles rejects viewer
    vi.mocked(requirePortalApiAuth).mockResolvedValue(
      makeAuthFailure(403, 'forbidden') as never
    )

    const res = await patchCampaign(
      new Request('http://localhost/api/portal/campaigns/camp-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    expect(res.status).toBe(403)
    // updatePortalCampaign should NOT have been called
    expect(updatePortalCampaign).not.toHaveBeenCalled()
  })
})

describe('Phase 3.2 — Privilege Escalation: Portal user cannot access admin routes', () => {
  it('admin route returns 401 when called without admin auth', async () => {
    // Simulate what happens when a portal-only user hits an admin route
    vi.mocked(requireDashboardApiAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'unauthorized' },
        { status: 401 }
      ),
    } as never)

    // Import a representative admin route
    const { GET } = await import('@/app/api/admin/assessments/route')
    const res = await GET(new Request('http://localhost/api/admin/assessments'))

    expect(res.status).toBe(401)
  })
})

describe('Phase 3.2 — Privilege Escalation: Staff cannot use admin-only routes', () => {
  it('admin-only route rejects staff with 403', async () => {
    vi.mocked(requireDashboardApiAuth).mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'forbidden', message: 'Admin access required.' },
        { status: 403 }
      ),
    } as never)

    const { POST } = await import('@/app/api/admin/campaigns/route')
    const res = await POST(
      new Request('http://localhost/api/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({ name: 'Hack Campaign' }),
      })
    )

    expect(res.status).toBe(403)
  })
})

describe('Phase 3.2 — Role enforcement uses allowedRoles on write routes', () => {
  it('PATCH campaign route calls requirePortalApiAuth with allowedRoles', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthForOrg(ORG_A) as never)
    vi.mocked(updatePortalCampaign).mockResolvedValue({
      ok: true,
      data: { campaign: { id: 'camp-1' } },
    } as never)

    await patchCampaign(
      new Request('http://localhost/api/portal/campaigns/camp-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'active' }),
      }),
      { params: Promise.resolve({ id: 'camp-1' }) }
    )

    // Verify allowedRoles was passed
    expect(requirePortalApiAuth).toHaveBeenCalledWith({
      allowedRoles: ['org_owner', 'org_admin', 'campaign_manager'],
    })
  })
})
