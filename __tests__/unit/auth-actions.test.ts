import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirectMock,
  revalidatePathMock,
  createServerClientMock,
  createAdminClientMock,
  cookiesMock,
  assertSameOriginMock,
  resolveUserEntitlementsMock,
  activatePortalMembershipIfInvitedMock,
  getPasswordRedirectUrlMock,
  supabaseJsCreateClientMock,
  writeAuthHandoffCookieMock,
  clearAuthHandoffCookieMock,
  isAuthHandoffConfiguredMock,
  getAuthHandoffUrlMock,
  usesSameOriginAuthHandoffMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw { __redirect: true, url }
  }),
  revalidatePathMock: vi.fn(),
  createServerClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  cookiesMock: vi.fn(),
  assertSameOriginMock: vi.fn(),
  resolveUserEntitlementsMock: vi.fn(),
  activatePortalMembershipIfInvitedMock: vi.fn(),
  getPasswordRedirectUrlMock: vi.fn(),
  supabaseJsCreateClientMock: vi.fn(),
  writeAuthHandoffCookieMock: vi.fn(),
  clearAuthHandoffCookieMock: vi.fn(),
  isAuthHandoffConfiguredMock: vi.fn(),
  getAuthHandoffUrlMock: vi.fn(),
  usesSameOriginAuthHandoffMock: vi.fn(),
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
  createClient: createServerClientMock,
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
  getClientLoginUrl: vi.fn().mockReturnValue('https://www.example.com/client-login'),
}))

vi.mock('@/utils/hosts', () => ({
  getAdminBaseUrl: vi.fn().mockReturnValue('https://admin.example.com'),
  getPortalBaseUrl: vi.fn().mockReturnValue('https://portal.example.com'),
  getPublicBaseUrl: vi.fn().mockReturnValue('https://www.example.com'),
}))

vi.mock('@/utils/auth-handoff', () => ({
  writeAuthHandoffCookie: writeAuthHandoffCookieMock,
  clearAuthHandoffCookie: clearAuthHandoffCookieMock,
  isAuthHandoffConfigured: isAuthHandoffConfiguredMock,
  getAuthHandoffUrl: getAuthHandoffUrlMock,
  usesSameOriginAuthHandoff: usesSameOriginAuthHandoffMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: supabaseJsCreateClientMock,
}))

import { login, logout, portalLogout, requestPasswordReset } from '@/app/auth/actions'

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
  session?: { access_token: string; refresh_token: string } | null
}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: options?.user ?? null,
          session: options?.session ?? { access_token: 'access-token', refresh_token: 'refresh-token' },
        },
        error: options?.signInError ?? null,
      }),
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

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.com'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  assertSameOriginMock.mockResolvedValue(undefined)
  resolveUserEntitlementsMock.mockResolvedValue(makeEntitlements())
  activatePortalMembershipIfInvitedMock.mockResolvedValue(undefined)
  getPasswordRedirectUrlMock.mockReturnValue('https://portal.example.com/reset-password')
  cookiesMock.mockResolvedValue({ set: vi.fn(), delete: vi.fn() })
  writeAuthHandoffCookieMock.mockResolvedValue(true)
  clearAuthHandoffCookieMock.mockResolvedValue(undefined)
  isAuthHandoffConfiguredMock.mockReturnValue(true)
  getAuthHandoffUrlMock.mockImplementation((surface: 'admin' | 'portal') =>
    surface === 'admin' ? 'https://admin.example.com/auth/handoff' : 'https://portal.example.com/auth/handoff'
  )
  usesSameOriginAuthHandoffMock.mockReturnValue(false)
  createServerClientMock.mockResolvedValue({
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  } as never)
})

describe('login', () => {
  it('routes admin users from /client-login straight to the admin dashboard', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'admin-1', email: 'Admin@Example.com' },
    })
    supabaseJsCreateClientMock.mockReturnValue(supabase as never)
    resolveUserEntitlementsMock.mockResolvedValue(
      makeEntitlements({
        internalRole: 'admin',
        bootstrapInternalRole: true,
      })
    )
    const profileUpsertMock = vi.fn().mockResolvedValue({ error: null })
    createAdminClientMock.mockReturnValue({
      from: vi.fn(() => ({
        upsert: profileUpsertMock,
      })),
    } as never)

    await expect(
      login(
        makeFormData({
          surface: 'client',
          email: 'Admin@Example.com',
          password: 'secret',
        })
      )
    ).rejects.toMatchObject({ __redirect: true, url: 'https://admin.example.com/auth/handoff' })

    expect(resolveUserEntitlementsMock).toHaveBeenCalledWith('admin-1', 'Admin@Example.com')
    expect(writeAuthHandoffCookieMock).toHaveBeenCalledWith({
      surface: 'admin',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    expect(profileUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'admin-1',
        role: 'admin',
        portal_admin_access: true,
      }),
      { onConflict: 'user_id' }
    )
    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout')
  })

  it('routes invited portal users from /client-login into the portal without a second sign-in', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'user-1', email: 'client@example.com' },
    })
    supabaseJsCreateClientMock.mockReturnValue(supabase as never)
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
    ).rejects.toMatchObject({ __redirect: true, url: 'https://portal.example.com/auth/handoff' })

    expect(activatePortalMembershipIfInvitedMock).toHaveBeenCalledWith('membership-1', 'user-1')
    expect(writeAuthHandoffCookieMock).toHaveBeenCalledWith({
      surface: 'portal',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/', 'layout')
  })

  it('sets a same-origin session and redirects directly to /dashboard in local-style auth mode', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'admin-2', email: 'admin@example.com' },
    })
    supabaseJsCreateClientMock.mockReturnValue(supabase as never)
    resolveUserEntitlementsMock.mockResolvedValue(
      makeEntitlements({
        internalRole: 'admin',
      })
    )
    usesSameOriginAuthHandoffMock.mockReturnValue(true)

    await expect(
      login(
        makeFormData({
          surface: 'client',
          email: 'admin@example.com',
          password: 'secret',
        })
      )
    ).rejects.toMatchObject({ __redirect: true, url: '/dashboard' })

    expect(writeAuthHandoffCookieMock).not.toHaveBeenCalled()
    expect(createServerClientMock).toHaveBeenCalled()
  })

  it('returns invalid credentials back to /client-login', async () => {
    supabaseJsCreateClientMock.mockReturnValue(
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
    supabaseJsCreateClientMock.mockReturnValue(supabase as never)
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

    expect(writeAuthHandoffCookieMock).not.toHaveBeenCalled()
  })

  it('returns misconfigured access back to /client-login and signs the user out', async () => {
    const supabase = makeSupabaseClient({
      user: { id: 'user-3', email: 'client@example.com' },
    })
    supabaseJsCreateClientMock.mockReturnValue(supabase as never)
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

    expect(writeAuthHandoffCookieMock).not.toHaveBeenCalled()
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

    expect(supabaseJsCreateClientMock).not.toHaveBeenCalled()
  })

  it('returns a configuration error when auth handoff is unavailable', async () => {
    isAuthHandoffConfiguredMock.mockReturnValue(false)

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
      url: buildUrl('/client-login', { error: 'handoff_unavailable' }),
    })
  })
})

describe('requestPasswordReset', () => {
  it('uses portal reset URLs but returns success messages to /client-login', async () => {
    const supabase = makeSupabaseClient()
    createServerClientMock.mockResolvedValue(supabase as never)

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

describe('logout', () => {
  it('returns admin logout to the branded public client login', async () => {
    const supabase = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }
    createServerClientMock.mockResolvedValue(supabase as never)

    await expect(logout()).rejects.toMatchObject({
      __redirect: true,
      url: 'https://www.example.com/client-login',
    })

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    expect(clearAuthHandoffCookieMock).toHaveBeenCalledTimes(1)
  })

  it('returns portal logout to the branded public client login', async () => {
    const setMock = vi.fn()
    cookiesMock.mockResolvedValue({ set: setMock, delete: vi.fn() })
    const supabase = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }
    createServerClientMock.mockResolvedValue(supabase as never)

    await expect(portalLogout()).rejects.toMatchObject({
      __redirect: true,
      url: 'https://www.example.com/client-login',
    })

    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    expect(setMock).toHaveBeenCalled()
    expect(clearAuthHandoffCookieMock).toHaveBeenCalledTimes(1)
  })
})
