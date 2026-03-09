import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getPortalCampaignDetail,
  updatePortalCampaign,
} from '@/utils/services/portal-campaign-detail'

function createGetAdminClient(options?: { data?: unknown; error?: unknown }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.data ?? null,
      error: options?.error ?? null,
    }),
  }

  return {
    from: vi.fn(() => query),
  }
}

function createUpdateAdminClient(options?: {
  existing?: unknown
  existingError?: unknown
  updated?: unknown
  updateError?: unknown
}) {
  const existingQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.existing ?? null,
      error: options?.existingError ?? null,
    }),
  }
  const updateQuery = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.updated ?? null,
      error: options?.updateError ?? null,
    }),
  }

  let campaignsCalls = 0
  return {
    from: vi.fn((table: string) => {
      if (table !== 'campaigns') return {}
      campaignsCalls += 1
      return campaignsCalls === 1 ? existingQuery : updateQuery
    }),
    updateQuery,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getPortalCampaignDetail', () => {
  it('returns not found when the campaign is outside the organisation', async () => {
    const result = await getPortalCampaignDetail({
      adminClient: createGetAdminClient() as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result).toEqual({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })
  })

  it('returns the campaign payload', async () => {
    const result = await getPortalCampaignDetail({
      adminClient: createGetAdminClient({
        data: { id: 'camp-1', name: 'Pilot' },
      }) as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
    })

    expect(result).toEqual({
      ok: true,
      data: { campaign: { id: 'camp-1', name: 'Pilot' } },
    })
  })
})

describe('updatePortalCampaign', () => {
  it('rejects invalid payloads', async () => {
    const result = await updatePortalCampaign({
      adminClient: createUpdateAdminClient() as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
      payload: null,
    })

    expect(result).toEqual({
      ok: false,
      error: 'validation_error',
      message: 'Invalid payload.',
    })
  })

  it('returns not found when the campaign does not exist in the organisation', async () => {
    const result = await updatePortalCampaign({
      adminClient: createUpdateAdminClient({
        existing: null,
      }) as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
      payload: { status: 'active' },
    })

    expect(result).toEqual({
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    })
  })

  it('rejects empty names', async () => {
    const result = await updatePortalCampaign({
      adminClient: createUpdateAdminClient({
        existing: { status: 'draft', config: { report_access: 'immediate' } },
      }) as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
      payload: { name: '   ' },
    })

    expect(result).toEqual({
      ok: false,
      error: 'validation_error',
      message: 'Campaign name cannot be empty.',
    })
  })

  it('rejects invalid status transitions', async () => {
    const result = await updatePortalCampaign({
      adminClient: createUpdateAdminClient({
        existing: { status: 'draft', config: {} },
      }) as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
      payload: { status: 'closed' },
    })

    expect(result).toEqual({
      ok: false,
      error: 'validation_error',
      message: 'Cannot transition campaign from draft to closed.',
    })
  })

  it('merges config and returns the updated campaign', async () => {
    const adminClient = createUpdateAdminClient({
      existing: {
        status: 'active',
        config: {
          report_access: 'immediate',
          demographics_enabled: false,
        },
      },
      updated: {
        id: 'camp-1',
        status: 'closed',
        config: {
          report_access: 'gated',
          demographics_enabled: false,
        },
      },
    })

    const result = await updatePortalCampaign({
      adminClient: adminClient as never,
      organisationId: 'org-1',
      campaignId: 'camp-1',
      payload: {
        name: 'Pilot 2',
        status: 'closed',
        config: { report_access: 'gated' },
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        campaign: {
          id: 'camp-1',
          status: 'closed',
          config: {
            report_access: 'gated',
            demographics_enabled: false,
          },
        },
      },
    })
    expect(adminClient.updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Pilot 2',
        status: 'closed',
        config: {
          report_access: 'gated',
          demographics_enabled: false,
        },
      })
    )
  })
})
