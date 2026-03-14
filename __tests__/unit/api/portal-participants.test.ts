import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'

vi.mock('@/utils/portal-api-auth', () => ({ requirePortalApiAuth: vi.fn() }))
vi.mock('@/utils/services/portal-participants', () => ({
  listPortalParticipants: vi.fn(),
  parsePortalParticipantsQuery: vi.fn(),
  getPortalParticipantResult: vi.fn(),
}))

import { GET as getParticipants } from '@/app/api/portal/participants/route'
import { GET as getParticipantResult } from '@/app/api/portal/participants/[submissionId]/route'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import {
  getPortalParticipantResult,
  listPortalParticipants,
  parsePortalParticipantsQuery,
} from '@/utils/services/portal-participants'

function makeAuthSuccess() {
  return {
    ok: true as const,
    user: { id: 'user-1', email: 'user@example.com' },
    context: {
      organisationId: 'org-1',
      role: 'viewer',
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
  vi.mocked(parsePortalParticipantsQuery).mockReturnValue({
    q: '',
    campaignId: '',
    assessmentId: '',
    page: 1,
    pageSize: 25,
  })
})

describe('GET /api/portal/participants', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(401, 'unauthorized') as never)

    const res = await getParticipants(new Request('http://localhost/api/portal/participants'))

    expect(res.status).toBe(401)
  })

  it('returns participant list from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listPortalParticipants).mockResolvedValue({
      ok: true,
      data: {
        participants: [],
        filters: { campaigns: [], assessments: [] },
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      },
    })

    const res = await getParticipants(new Request('http://localhost/api/portal/participants'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })

  it('maps forbidden errors to 403', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(listPortalParticipants).mockResolvedValue({
      ok: false,
      error: 'forbidden',
      message: 'Campaign does not belong to your organisation.',
    })

    const res = await getParticipants(new Request('http://localhost/api/portal/participants'))
    expect(res.status).toBe(403)
  })
})

describe('GET /api/portal/participants/[submissionId]', () => {
  const params = Promise.resolve({ submissionId: 'sub-1' })

  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(403, 'forbidden') as never)

    const res = await getParticipantResult(
      new Request('http://localhost/api/portal/participants/sub-1'),
      { params }
    )

    expect(res.status).toBe(403)
  })

  it('returns participant detail from the service', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(getPortalParticipantResult).mockResolvedValue({
      ok: true,
      data: {
        result: {
          id: 'sub-1',
          campaign: { id: 'camp-1', name: 'Campaign', slug: 'campaign' },
          assessment: null,
          participant: {
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'ada@example.com',
            organisation: 'Org',
            role: 'Lead',
          },
          status: 'completed',
          completed_at: null,
          created_at: '',
          reportOptions: [{
            key: 'current',
            label: 'Current report',
            description: 'Current report view.',
            currentDefault: true,
            accessToken: 'tok',
            reportType: 'assessment',
            viewHref: '/assess/r/assessment?access=tok',
            canExport: true,
            canEmail: true,
          }],
        },
      },
    })

    const res = await getParticipantResult(
      new Request('http://localhost/api/portal/participants/sub-1'),
      { params }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.result.id).toBe('sub-1')
  })

  it('maps not found errors to 404', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthSuccess() as never)
    vi.mocked(getPortalParticipantResult).mockResolvedValue({
      ok: false,
      error: 'not_found',
      message: 'Participant result was not found.',
    })

    const res = await getParticipantResult(
      new Request('http://localhost/api/portal/participants/sub-1'),
      { params }
    )

    expect(res.status).toBe(404)
  })
})
