import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirectMock,
  revalidatePathMock,
  createClientMock,
  createAdminClientMock,
  cookiesMock,
  assertSameOriginMock,
  resolveUserEntitlementsMock,
  activatePortalMembershipIfInvitedMock,
  getPasswordRedirectUrlMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw { __redirect: true, url }
  }),
  revalidatePathMock: vi.fn(),
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  cookiesMock: vi.fn(),
  assertSameOriginMock: vi.fn(),
  resolveUserEntitlementsMock: vi.fn(),
  activatePortalMembershipIfInvitedMock: vi.fn(),
  getPasswordRedirectUrlMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

vi.mock('@/utils/security/origin', () => ({
  assertSameOrigin: assertSameOriginMock,
}))

vi.mock('@/utils/auth-entitlements', () => ({
  resolveUserEntitlements: resolveUserEntitlementsMock,
  activatePortalMembershipIfInvited: activatePortalMembershipIfInvitedMock,
}))

vi.mock('@/utils/auth-urls', () => ({
  getPasswordRedirectUrl: getPasswordRedirectUrlMock,
}))

vi.mock('@/utils/hosts', () => ({
  getAdminBaseUrl: vi.fn().mockReturnValue('https://admin.example.com'),
  getPortalBaseUrl: vi.fn().mockReturnValue('https://portal.example.com'),
}))

import { login, requestPasswordReset } from '@/app/auth/actions'

function makeFormData(values: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value)
  }
  return formData
}

function buildUrl(path: string, params: Record<string, string>) {
  return `${path}?${new URLSearchParams(params).toString()}`
}

function makeSupabaseClient(options?: {
  signInError?: { message: string } | null
  user?: { id: string; email: string | null } | null
  resetError?: { message: string } | null
}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: options?.signInError ?? null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: options?.user ?? null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: options?.resetError ?? null }),
    },
  }
}

function makeEntitlements(overrides?: Partial<{
  adminClientAvailable: boolean
  bootstrapInternalRole: boolean
  internalRole: string | null
  portalMembership: { id: string; status: 'active' | 'invited' } | null
}>) {
  return {
    adminClientAvailable: true,
    bootstrapInternalRole: false,
    internalRole: null,
    portalMembership: null,
    ...overrides,
  }
}

function makeAdminClient() {
  return {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  assertSameOriginMock.mockResolvedValue(undefined)
  resolveUserEntitlementsMock.mockResolvedValue(makeEntitlements())
  activatePortalMembershipIfInvitedMock.mockResolvedValue(undefined)
  getPasswordRedirectUrlMock.mockReturnValue('https://portal.example.com/reset-password')
  cookiesMock.mockResolvedValue({ delete: vi.fn() })
})

describe('login', () => {
  it('routes admin users from /client-login straight to the admin dashboard', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'admin-1', email: 'Admin@Example.com' },
    })
    createClientMock.mockResolvedValue(supabase as never)
    resolveUserEntitlementsMock.mockResolvedValue(
      makeEntitlements({
        internalRole: 'admin',
        bootstrapInternalRole: true,
      })
    )
    createAdminClientMock.mockReturnValue(makeAdminClient() as never)

    await expect(
      login(
        makeFormData({
          surface: 'client',
          email: 'Admin@Example.com',
          password: 'secret',
        })
      )
    ).rejects.toMatchObject({ __redirect: true, url: 'https://admin.example.com/dashboard' })

    expect(resolveUserEntitlementsMock).toHaveBeenCalledWith('admin-1', 'Admin@Example.com')
    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout')
  })

  it('routes invited portal users from /client-login into the portal without a second sign-in', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'user-1', email: 'client@example.com' },
    })
    createClientMock.mockResolvedValue(supabase as never)
    resolveUserEntitlementsMock.mockResolvedValue(
      makeEntitlements({
        portalMembership: { id: 'membership-1', status: 'invited' },
      })
    )

    await expect(
      login(
        makeFormData({
          surface: 'client',
          email: 'client@example.com',
          password: 'secret',
        })
      )
    ).rejects.toMatchObject({ __redirect: true, url: 'https://portal.example.com/portal' })

    expect(activatePortalMembershipIfInvitedMock).toHaveBeenCalledWith('membership-1', 'user-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout')
  })

  it('returns invalid credentials back to /client-login', async () => {
    createClientMock.mockResolvedValue(
      makeSupabaseClient({
        signInError: { message: 'invalid_credentials' },
      }) as never
    )

    await expect(
      login(
        makeFormData({
          surface: 'client',
          email: 'client@example.com',
          password: 'wrong',
        })
      )
    ).rejects.toMatchObject({
      __redirect: true,
      url: buildUrl('/client-login', { error: 'invalid_credentials' }),
    })
  })

  it('returns forbidden users back to /client-login and signs them out', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'user-2', email: 'client@example.com' },
    })
    createClientMock.mockResolvedValue(supabase as never)
    resolveUserEntitlementsMock.mockResolvedValue(makeEntitlements())

    await expect(
      login(
        makeFormData({
          surface: 'client',
          email: 'client@example.com',
          password: 'secret',
        })
      )
    ).rejects.toMatchObject({
      __redirect: true,
      url: buildUrl('/client-login', { error: 'forbidden' }),
    })

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('returns misconfigured access back to /client-login and signs the user out', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'user-3', email: 'client@example.com' },
    })
    createClientMock.mockResolvedValue(supabase as never)
    resolveUserEntitlementsMock.mockResolvedValue(
      makeEntitlements({
        adminClientAvailable: false,
      })
    )

    await expect(
      login(
        makeFormData({
          surface: 'client',
          email: 'client@example.com',
          password: 'secret',
        })
      )
    ).rejects.toMatchObject({
      __redirect: true,
      url: buildUrl('/client-login', { error: 'missing_service_role' }),
    })

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('falls back to /client-login on invalid origin checks', async () => {
    assertSameOriginMock.mockRejectedValue(new Error('invalid_origin'))

    await expect(
      login(
        makeFormData({
          surface: 'client',
          email: 'client@example.com',
          password: 'secret',
        })
      )
    ).rejects.toMatchObject({
      __redirect: true,
      url: buildUrl('/client-login', { error: 'invalid_origin' }),
    })

    expect(createClientMock).not.toHaveBeenCalled()
  })
})

describe('requestPasswordReset', () => {
  it('uses portal reset URLs but returns success messages to /client-login', async () => {
    const supabase = makeSupabaseClient()
    createClientMock.mockResolvedValue(supabase as never)

    await expect(
      requestPasswordReset(
        makeFormData({
          audience: 'portal',
          surface: 'client',
          email: 'Client@Example.com',
        })
      )
    ).rejects.toMatchObject({
      __redirect: true,
      url: buildUrl('/client-login', {
        message: 'If that email is registered, a reset link has been sent.',
      }),
    })

    expect(getPasswordRedirectUrlMock).toHaveBeenCalledWith('reset', 'portal')
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('client@example.com', {
      redirectTo: 'https://portal.example.com/reset-password',
    })
  })

  it('returns reset origin errors to /client-login', async () => {
    assertSameOriginMock.mockRejectedValue(new Error('invalid_origin'))

    await expect(
      requestPasswordReset(
        makeFormData({
          audience: 'portal',
          surface: 'client',
          email: 'client@example.com',
        })
      )
    ).rejects.toMatchObject({
      __redirect: true,
      url: buildUrl('/client-login', { reset_error: 'invalid_origin' }),
    })
  })
})
