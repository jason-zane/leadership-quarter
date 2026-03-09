import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createPortalCampaign,
  listPortalCampaigns,
  parsePortalCampaignsQuery,
} from '@/utils/services/portal-campaigns'

function createListAdminClient(options?: {
  campaigns?: unknown[]
  count?: number
  error?: unknown
}) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data: options?.campaigns ?? [],
      error: options?.error ?? null,
      count: options?.count ?? 0,
    }),
  }

  return {
    from: vi.fn(() => query),
  }
}

function createCampaignAdminClient(options?: {
  allowedRows?: Array<{ assessment_id: string }>
  allowedError?: unknown
  campaign?: { id: string; slug?: string } | null
  createError?: { code?: string } | null
  linkError?: unknown
}) {
  const assessmentAccessQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({
      data: options?.allowedRows ?? [],
      error: options?.allowedError ?? null,
    }),
  }
  assessmentAccessQuery.eq.mockReturnValueOnce(assessmentAccessQuery)
  assessmentAccessQuery.eq.mockReturnValueOnce(assessmentAccessQuery)

  const campaignsInsertQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: options?.campaign ?? null,
      error: options?.createError ?? null,
    }),
  }

  const assessmentLinkQuery = {
    insert: vi.fn().mockResolvedValue({ error: options?.linkError ?? null }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'organisation_assessment_access') return assessmentAccessQuery
      if (table === 'campaigns') return campaignsInsertQuery
      if (table === 'campaign_assessments') return assessmentLinkQuery
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('parsePortalCampaignsQuery', () => {
  it('normalizes query params and caps page size', () => {
    const result = parsePortalCampaignsQuery(
      new URLSearchParams({
        includeArchived: 'true',
        page: '2',
        pageSize: '500',
      })
    )

    expect(result).toEqual({
      includeArchived: true,
      page: 2,
      pageSize: 100,
    })
  })
})

describe('listPortalCampaigns', () => {
  it('returns paginated campaign data', async () => {
    const result = await listPortalCampaigns({
      adminClient: createListAdminClient({
        campaigns: [{ id: 'camp-1', name: 'Pilot' }],
        count: 1,
      }) as never,
      organisationId: 'org-1',
      filters: {
        includeArchived: false,
        page: 1,
        pageSize: 25,
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        campaigns: [{ id: 'camp-1', name: 'Pilot' }],
        includeArchived: false,
        pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      },
    })
  })
})

describe('createPortalCampaign', () => {
  it('rejects missing required fields', async () => {
    const result = await createPortalCampaign({
      adminClient: createCampaignAdminClient() as never,
      organisationId: 'org-1',
      userId: 'user-1',
      payload: { name: '', assessment_ids: [] },
    })

    expect(result).toEqual({
      ok: false,
      error: 'validation_error',
      message: 'Campaign name is required.',
    })
  })

  it('rejects assessments not assigned to the organisation', async () => {
    const result = await createPortalCampaign({
      adminClient: createCampaignAdminClient({
        allowedRows: [{ assessment_id: 'assess-1' }],
      }) as never,
      organisationId: 'org-1',
      userId: 'user-1',
      payload: {
        name: 'Pilot',
        assessment_ids: ['assess-1', 'assess-2'],
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'forbidden',
      message: 'One or more assessments are not assigned to your organisation.',
    })
  })

  it('maps duplicate slugs to a conflict error', async () => {
    const result = await createPortalCampaign({
      adminClient: createCampaignAdminClient({
        allowedRows: [{ assessment_id: 'assess-1' }],
        createError: { code: '23505' },
      }) as never,
      organisationId: 'org-1',
      userId: 'user-1',
      payload: {
        name: 'Pilot',
        slug: 'pilot',
        assessment_ids: ['assess-1'],
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'conflict',
      message: 'Campaign slug is already in use.',
    })
  })

  it('creates the campaign and links assessments', async () => {
    const adminClient = createCampaignAdminClient({
      allowedRows: [{ assessment_id: 'assess-1' }],
      campaign: { id: 'camp-1', slug: 'pilot' },
    })

    const result = await createPortalCampaign({
      adminClient: adminClient as never,
      organisationId: 'org-1',
      userId: 'user-1',
      payload: {
        name: 'Pilot',
        assessment_ids: ['assess-1'],
      },
    })

    expect(result).toEqual({
      ok: true,
      data: { campaign: { id: 'camp-1', slug: 'pilot' } },
    })
  })
})
