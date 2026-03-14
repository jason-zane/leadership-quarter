import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirectMock,
  revalidatePathMock,
  createAdminClientMock,
  requireAdminUserMock,
  getPasswordRedirectUrlMock,
  assertSameOriginMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw { __redirect: true, url }
  }),
  revalidatePathMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  requireAdminUserMock: vi.fn(),
  getPasswordRedirectUrlMock: vi.fn(),
  assertSameOriginMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/utils/dashboard-auth', () => ({
  requireAdminUser: requireAdminUserMock,
}))

vi.mock('@/utils/auth-urls', () => ({
  getPasswordRedirectUrl: getPasswordRedirectUrlMock,
}))

vi.mock('@/utils/security/origin', () => ({
  assertSameOrigin: assertSameOriginMock,
}))

vi.mock('@/utils/services/organisation-members', () => ({
  attachOrganisationMember: vi.fn(),
}))

import { inviteUser, updateUserRole } from '@/app/dashboard/users/actions'

function makeFormData(values: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
  assertSameOriginMock.mockReturnValue(undefined)
  requireAdminUserMock.mockResolvedValue({
    authorized: true,
    user: { id: 'current-admin' },
  })
  getPasswordRedirectUrlMock.mockReturnValue('https://admin.example.com/set-password')
})

describe('dashboard user actions', () => {
  it('enables client portal launch when a user is promoted to admin', async () => {
    const profileUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const adminAuditInsertMock = vi.fn().mockResolvedValue({ error: null })

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { role: 'staff', portal_admin_access: false },
                  error: null,
                }),
              })),
            })),
            upsert: profileUpsertMock,
          }
        }

        if (table === 'admin_audit_logs') {
          return {
            insert: adminAuditInsertMock,
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    await expect(
      updateUserRole(
        makeFormData({
          user_id: 'user-1',
          role: 'admin',
        })
      )
    ).rejects.toMatchObject({ __redirect: true, url: '/dashboard/users?saved=1' })

    expect(profileUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        role: 'admin',
        portal_admin_access: true,
      }),
      { onConflict: 'user_id' }
    )
  })

  it('inviting a new admin enables client portal launch by default', async () => {
    const profileUpsertMock = vi.fn().mockResolvedValue({ error: null })
    const inviteUserByEmailMock = vi.fn().mockResolvedValue({
      data: { user: { id: 'invited-user-1' } },
      error: null,
    })
    const adminAuditInsertMock = vi.fn().mockResolvedValue({ error: null })

    createAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
          inviteUserByEmail: inviteUserByEmailMock,
        },
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            upsert: profileUpsertMock,
          }
        }

        if (table === 'admin_audit_logs') {
          return {
            insert: adminAuditInsertMock,
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    })

    await expect(
      inviteUser(
        makeFormData({
          email: 'new-admin@example.com',
          role: 'admin',
        })
      )
    ).rejects.toMatchObject({ __redirect: true, url: '/dashboard/users?saved=invited_set_sent' })

    expect(inviteUserByEmailMock).toHaveBeenCalled()
    expect(profileUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'invited-user-1',
        role: 'admin',
        portal_admin_access: true,
      }),
      { onConflict: 'user_id' }
    )
  })
})
