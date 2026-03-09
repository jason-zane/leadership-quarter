import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/auth-urls', () => ({
  getPasswordRedirectUrl: vi.fn((surface: string, audience: string) =>
    `https://example.com/${surface}/${audience}`
  ),
}))

import {
  deleteOrganisationMember,
  inviteOrganisationMember,
  listOrganisationMembers,
  parseOrganisationMemberInvitePayload,
  updateOrganisationMember,
} from '@/utils/services/organisation-members'

function makeAdminClientMock(options?: {
  membershipRows?: unknown[]
  membershipUpsertRow?: unknown
  membershipError?: unknown
  listUsersPages?: Array<{ users: Array<{ id: string; email?: string | null }> }>
  inviteError?: { message: string } | null
  inviteUser?: { id: string; email?: string | null } | null
  createUser?: { id: string; email?: string | null } | null
  generateLink?: string | null
}) {
  const membershipRows = options?.membershipRows ?? []
  const membershipUpsertRow =
    options?.membershipUpsertRow ??
    {
      id: 'm-1',
      organisation_id: 'org-1',
      user_id: 'user-1',
      role: 'viewer',
      status: 'invited',
      invited_at: null,
      accepted_at: null,
      created_at: '',
      updated_at: '',
    }
  const listUsersPages = options?.listUsersPages ?? [{ users: [] }]
  let listUsersIndex = 0

  const membershipsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: membershipRows, error: options?.membershipError ?? null }),
    upsert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: membershipUpsertRow,
      error: options?.membershipError ?? null,
    }),
  }
  const auditLogs = {
    insert: vi.fn().mockResolvedValue({ error: null }),
  }

  return {
    auth: {
      admin: {
        listUsers: vi.fn().mockImplementation(() => {
          const page = listUsersPages[Math.min(listUsersIndex, listUsersPages.length - 1)]
          listUsersIndex += 1
          return Promise.resolve({ data: page, error: null })
        }),
        inviteUserByEmail: vi.fn().mockResolvedValue({
          data: { user: options?.inviteUser ?? null },
          error: options?.inviteError ?? null,
        }),
        createUser: vi.fn().mockResolvedValue({
          data: { user: options?.createUser ?? { id: 'created-user', email: 'member@example.com' } },
          error: null,
        }),
        generateLink: vi.fn().mockResolvedValue({
          data: { properties: { action_link: options?.generateLink ?? 'https://example.com/setup' } },
          error: null,
        }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'organisation_memberships') return membershipsQuery
      if (table === 'admin_audit_logs') return auditLogs
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('parseOrganisationMemberInvitePayload', () => {
  it('rejects invalid role/email payloads', () => {
    const result = parseOrganisationMemberInvitePayload({
      email: 'bad',
      role: 'bad' as never,
      mode: 'auto',
    })

    expect(result).toEqual({ ok: false, error: 'invalid_payload' })
  })

  it('normalizes a valid payload', () => {
    const result = parseOrganisationMemberInvitePayload({
      email: ' MEMBER@Example.com ',
      role: 'viewer',
      mode: 'manual_link',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        email: 'member@example.com',
        role: 'viewer',
        mode: 'manual_link',
      },
    })
  })
})

describe('listOrganisationMembers', () => {
  it('merges auth emails onto membership rows', async () => {
    const adminClient = makeAdminClientMock({
      membershipRows: [
        {
          id: 'm-1',
          organisation_id: 'org-1',
          user_id: 'user-1',
          role: 'viewer',
          status: 'invited',
          invited_at: null,
          accepted_at: null,
          created_at: '',
          updated_at: '',
        },
      ],
      listUsersPages: [{ users: [{ id: 'user-1', email: 'member@example.com' }] }],
    })

    const result = await listOrganisationMembers({
      adminClient: adminClient as never,
      organisationId: 'org-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        members: [
          expect.objectContaining({
            user_id: 'user-1',
            email: 'member@example.com',
          }),
        ],
      },
    })
  })
})

describe('inviteOrganisationMember', () => {
  it('falls back to a manual link when email delivery fails in auto mode', async () => {
    const adminClient = makeAdminClientMock({
      inviteError: { message: 'SMTP rate limit exceeded' },
      createUser: { id: 'created-user', email: 'member@example.com' },
      membershipUpsertRow: {
        id: 'm-1',
        organisation_id: 'org-1',
        user_id: 'created-user',
        role: 'viewer',
        status: 'invited',
        invited_at: null,
        accepted_at: null,
        created_at: '',
        updated_at: '',
      },
    })

    const result = await inviteOrganisationMember({
      adminClient: adminClient as never,
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      payload: {
        email: 'member@example.com',
        role: 'viewer',
        mode: 'auto',
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        member: expect.objectContaining({
          user_id: 'created-user',
          email: 'member@example.com',
        }),
        delivery: 'auto_fallback',
        setup_link: 'https://example.com/setup',
        warning: expect.stringContaining('Email invite failed'),
      },
    })
  })

  it('returns a fatal invite error for email-only mode', async () => {
    const adminClient = makeAdminClientMock({
      inviteError: { message: 'SMTP unavailable' },
    })

    const result = await inviteOrganisationMember({
      adminClient: adminClient as never,
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      payload: {
        email: 'member@example.com',
        role: 'viewer',
        mode: 'email',
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'invite_email_provider_failed',
      message: 'SMTP unavailable',
    })
  })
})

describe('updateOrganisationMember', () => {
  it('rejects invalid roles', async () => {
    const result = await updateOrganisationMember({
      adminClient: {} as never,
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      membershipId: 'm-1',
      payload: {
        role: 'bad' as never,
      },
    })

    expect(result).toEqual({ ok: false, error: 'invalid_role' })
  })

  it('returns the updated membership on success', async () => {
    const auditLogs = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    const updateQuery = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'm-1',
          organisation_id: 'org-1',
          user_id: 'user-1',
          role: 'org_admin',
          status: 'active',
          invited_at: null,
          accepted_at: null,
          created_at: '',
          updated_at: '',
        },
        error: null,
      }),
    }
    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === 'organisation_memberships') {
          return {
            update: vi.fn().mockReturnValue(updateQuery),
          }
        }
        if (table === 'admin_audit_logs') return auditLogs
        return {}
      }),
    }

    const result = await updateOrganisationMember({
      adminClient: adminClient as never,
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      membershipId: 'm-1',
      payload: {
        role: 'org_admin',
        status: 'active',
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        member: expect.objectContaining({
          id: 'm-1',
          role: 'org_admin',
          status: 'active',
        }),
      },
    })
  })
})

describe('deleteOrganisationMember', () => {
  it('returns delete failures', async () => {
    const existingQuery = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }
    const deleteQuery = {
      eq: vi.fn().mockReturnThis(),
    }
    deleteQuery.eq
      .mockReturnValueOnce(deleteQuery)
      .mockReturnValueOnce(Promise.resolve({ error: { message: 'failed' } }))

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === 'organisation_memberships') {
          return {
            select: vi.fn().mockReturnValue(existingQuery),
            delete: vi.fn().mockReturnValue(deleteQuery),
          }
        }
        return {}
      }),
    }

    const result = await deleteOrganisationMember({
      adminClient: adminClient as never,
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      membershipId: 'm-1',
    })

    expect(result).toEqual({ ok: false, error: 'membership_delete_failed' })
  })
})
