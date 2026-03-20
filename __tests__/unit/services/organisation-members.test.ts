import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/auth-urls', () => ({
  getPasswordRedirectUrl: vi.fn((surface: string, audience: string) =>
    `https://example.com/${surface}/${audience}`
  ),
}))

import {
  attachOrganisationMember,
  deleteOrganisationMember,
  inviteOrganisationMember,
  listOrganisationMembers,
  parseOrganisationMemberAttachPayload,
  parseOrganisationMemberInvitePayload,
  updateOrganisationMember,
} from '@/utils/services/organisation-members'

function makeAdminClientMock(options?: {
  membershipRows?: unknown[]
  membershipUpsertRow?: unknown
  membershipError?: { message?: string; code?: string } | null
  membershipUpsertError?: { message?: string; code?: string } | null
  profileRows?: unknown[]
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
  const profileRows = options?.profileRows ?? []
  const listUsersPages = options?.listUsersPages ?? [{ users: [] }]
  let listUsersIndex = 0

  const membershipSelectResult = {
    data: membershipRows,
    error: options?.membershipError ?? null,
  }
  const membershipsSelectQuery = {
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(membershipSelectResult),
    then: (resolve: (value: typeof membershipSelectResult) => unknown) =>
      Promise.resolve(membershipSelectResult).then(resolve),
  }
  const membershipUpsertResult = {
    data: membershipUpsertRow,
    error: options?.membershipUpsertError ?? options?.membershipError ?? null,
  }
  const membershipsTable = {
    select: vi.fn().mockReturnValue(membershipsSelectQuery),
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(membershipUpsertResult),
      }),
    }),
  }
  const profilesTable = {
    select: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ data: profileRows, error: null }),
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
      if (table === 'organisation_memberships') return membershipsTable
      if (table === 'profiles') return profilesTable
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

describe('parseOrganisationMemberAttachPayload', () => {
  it('rejects payloads without an email or user id', () => {
    const result = parseOrganisationMemberAttachPayload({
      role: 'viewer',
    })

    expect(result).toEqual({ ok: false, error: 'invalid_payload' })
  })

  it('accepts an existing user id payload', () => {
    const result = parseOrganisationMemberAttachPayload({
      userId: 'user-1',
      role: 'org_admin',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        role: 'org_admin',
        email: null,
        userId: 'user-1',
      },
    })
  })
})

describe('listOrganisationMembers', () => {
  it('merges auth emails and internal profile metadata onto membership rows', async () => {
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
      profileRows: [
        {
          user_id: 'user-1',
          role: 'admin',
          portal_admin_access: true,
        },
      ],
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
            internal_role: 'admin',
            internal_portal_launch_enabled: true,
          }),
        ],
      },
    })
  })
})

describe('inviteOrganisationMember', () => {
  it('returns a setup link when email delivery succeeds', async () => {
    const adminClient = makeAdminClientMock({
      inviteUser: { id: 'invited-user', email: 'member@example.com' },
      membershipUpsertRow: {
        id: 'm-1',
        organisation_id: 'org-1',
        user_id: 'invited-user',
        role: 'viewer',
        status: 'invited',
        invited_at: null,
        accepted_at: null,
        created_at: '',
        updated_at: '',
      },
      generateLink: 'https://example.com/setup-from-email',
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
      ok: true,
      data: {
        member: expect.objectContaining({
          user_id: 'invited-user',
          email: 'member@example.com',
        }),
        delivery: 'email',
        setup_link: 'https://example.com/setup-from-email',
      },
    })
  })

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

  it('requires admins to use attach for existing users', async () => {
    const adminClient = makeAdminClientMock({
      listUsersPages: [{ users: [{ id: 'user-1', email: 'member@example.com' }] }],
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
      ok: false,
      error: 'invite_user_already_exists',
      message: 'User already exists. Attach them as an existing user instead.',
    })
  })
})

describe('attachOrganisationMember', () => {
  it('activates an existing user in the requested organisation', async () => {
    const adminClient = makeAdminClientMock({
      listUsersPages: [{ users: [{ id: 'user-1', email: 'member@example.com' }] }],
      membershipRows: [],
      membershipUpsertRow: {
        id: 'm-1',
        organisation_id: 'org-1',
        user_id: 'user-1',
        role: 'org_admin',
        status: 'active',
        invited_at: '2026-01-01T00:00:00.000Z',
        accepted_at: '2026-01-01T00:00:00.000Z',
        created_at: '',
        updated_at: '',
      },
    })

    const result = await attachOrganisationMember({
      adminClient: adminClient as never,
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      payload: {
        email: 'member@example.com',
        role: 'org_admin',
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        member: expect.objectContaining({
          user_id: 'user-1',
          email: 'member@example.com',
          role: 'org_admin',
          status: 'active',
        }),
      },
    })
  })

  it('rejects attaching a user who already belongs to another active client', async () => {
    const adminClient = makeAdminClientMock({
      listUsersPages: [{ users: [{ id: 'user-1', email: 'member@example.com' }] }],
      membershipRows: [
        {
          id: 'm-other',
          organisation_id: 'org-2',
          user_id: 'user-1',
          role: 'viewer',
          status: 'active',
          invited_at: null,
          accepted_at: null,
          created_at: '',
          updated_at: '',
          organisations: { name: 'Acme' },
        },
      ],
    })

    const result = await attachOrganisationMember({
      adminClient: adminClient as never,
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      payload: {
        email: 'member@example.com',
        role: 'viewer',
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'membership_conflict',
      message: 'User already has client access in Acme.',
    })
  })

  it('returns user_not_found when the account does not already exist', async () => {
    const adminClient = makeAdminClientMock({
      listUsersPages: [{ users: [] }],
    })

    const result = await attachOrganisationMember({
      adminClient: adminClient as never,
      actorUserId: 'admin-1',
      organisationId: 'org-1',
      payload: {
        email: 'missing@example.com',
        role: 'viewer',
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'user_not_found',
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
