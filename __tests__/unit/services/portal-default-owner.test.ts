import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  backfillDefaultPortalOwnerMemberships,
  ensureDefaultPortalOwnerMembership,
} from '@/utils/services/portal-default-owner'

function makeAdminClient(options?: {
  users?: Array<{ id: string; email?: string | null }>
  upsertError?: { message: string } | null
  organisations?: Array<{ id: string }>
}) {
  const membershipUpsert = vi
    .fn()
    .mockResolvedValue({ error: options?.upsertError ?? null })
  const auditInsert = vi.fn().mockResolvedValue({ error: null })
  const organisationsSelect = {
    eq: vi.fn().mockResolvedValue({
      data: options?.organisations ?? [],
      error: null,
    }),
  }

  return {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: options?.users ?? [] },
          error: null,
        }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'organisation_memberships') {
        return {
          upsert: membershipUpsert,
        }
      }

      if (table === 'admin_audit_logs') {
        return {
          insert: auditInsert,
        }
      }

      if (table === 'organisations') {
        return {
          select: vi.fn(() => organisationsSelect),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('portal default owner membership', () => {
  it('fails clearly when the default owner email is not configured', async () => {
    const adminClient = makeAdminClient()

    const result = await ensureDefaultPortalOwnerMembership({
      adminClient: adminClient as never,
      organisationId: 'org-1',
      actorUserId: 'admin-user',
    })

    expect(result).toEqual({
      ok: false,
      error: 'default_owner_not_configured',
      message: 'PORTAL_DEFAULT_OWNER_EMAIL is not set.',
    })
  })

  it('upserts an org_owner membership for the configured internal account', async () => {
    vi.stubEnv('PORTAL_DEFAULT_OWNER_EMAIL', 'owner@example.com')
    const adminClient = makeAdminClient({
      users: [{ id: 'owner-user', email: 'owner@example.com' }],
    })

    const result = await ensureDefaultPortalOwnerMembership({
      adminClient: adminClient as never,
      organisationId: 'org-1',
      actorUserId: 'admin-user',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        userId: 'owner-user',
        email: 'owner@example.com',
      },
    })
    expect(adminClient.from).toHaveBeenCalledWith('organisation_memberships')
    expect(adminClient.from).toHaveBeenCalledWith('admin_audit_logs')
  })

  it('backfills active organisations idempotently through the same helper path', async () => {
    vi.stubEnv('PORTAL_DEFAULT_OWNER_EMAIL', 'owner@example.com')
    const adminClient = makeAdminClient({
      users: [{ id: 'owner-user', email: 'owner@example.com' }],
      organisations: [{ id: 'org-1' }, { id: 'org-2' }],
    })

    const result = await backfillDefaultPortalOwnerMemberships({
      adminClient: adminClient as never,
      actorUserId: 'admin-user',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        organisationCount: 2,
        ownerEmail: 'owner@example.com',
      },
    })
    expect(adminClient.from).toHaveBeenCalledWith('organisations')
    expect(adminClient.from).toHaveBeenCalledWith('organisation_memberships')
  })
})
