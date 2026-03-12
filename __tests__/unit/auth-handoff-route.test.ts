import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  readAuthHandoffCookieMock,
  clearAuthHandoffCookieMock,
  clearAuthHandoffCookieOnResponseMock,
  createServerClientMock,
  getAuthHandoffDestinationUrlMock,
} = vi.hoisted(() => ({
  readAuthHandoffCookieMock: vi.fn(),
  clearAuthHandoffCookieMock: vi.fn(),
  clearAuthHandoffCookieOnResponseMock: vi.fn(),
  createServerClientMock: vi.fn(),
  getAuthHandoffDestinationUrlMock: vi.fn(),
}))

vi.mock('@/utils/auth-handoff', () => ({
  readAuthHandoffCookie: readAuthHandoffCookieMock,
  clearAuthHandoffCookie: clearAuthHandoffCookieMock,
  clearAuthHandoffCookieOnResponse: clearAuthHandoffCookieOnResponseMock,
  getAuthHandoffDestinationUrl: getAuthHandoffDestinationUrlMock,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

vi.mock('@/utils/auth-urls', () => ({
  getClientLoginUrl: vi.fn((params?: Record<string, string>) => {
    const query = new URLSearchParams(params ?? {}).toString()
    return query ? `https://www.example.com/client-login?${query}` : 'https://www.example.com/client-login'
  }),
}))

vi.mock('@/utils/hosts', () => ({
  getConfiguredHosts: vi.fn().mockReturnValue({
    publicHost: 'www.example.com',
    adminHost: 'admin.example.com',
    portalHost: 'portal.example.com',
  }),
  getAdminBaseUrl: vi.fn().mockReturnValue('https://admin.example.com'),
  getPortalBaseUrl: vi.fn().mockReturnValue('https://portal.example.com'),
  isLocalHost: vi.fn().mockReturnValue(false),
}))

import { GET } from '@/app/auth/handoff/route'

describe('GET /auth/handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAuthHandoffCookieMock.mockResolvedValue(undefined)
    clearAuthHandoffCookieOnResponseMock.mockImplementation(() => undefined)
    getAuthHandoffDestinationUrlMock.mockImplementation(
      (surface: 'admin' | 'portal', redirectPath: '/dashboard' | '/portal') =>
        surface === 'admin'
          ? `https://admin.example.com${redirectPath}`
          : `https://portal.example.com${redirectPath}`
    )
  })

  it('sets the target-host session and redirects to the admin dashboard', async () => {
    readAuthHandoffCookieMock.mockResolvedValue({
      surface: 'admin',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      redirectPath: '/dashboard',
    })

    createServerClientMock.mockReturnValue({
      auth: {
        setSession: vi.fn().mockResolvedValue({ error: null }),
      },
    } as never)

    const response = await GET(
      new NextRequest('https://admin.example.com/auth/handoff', {
        headers: { host: 'admin.example.com' },
      })
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://admin.example.com/dashboard')
    expect(clearAuthHandoffCookieOnResponseMock).toHaveBeenCalledTimes(1)
  })

  it('fails back to the branded public login when the handoff is missing', async () => {
    readAuthHandoffCookieMock.mockResolvedValue(null)

    const response = await GET(
      new NextRequest('https://portal.example.com/auth/handoff', {
        headers: { host: 'portal.example.com' },
      })
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://www.example.com/client-login?error=session_transfer_failed'
    )
    expect(clearAuthHandoffCookieMock).toHaveBeenCalledTimes(1)
  })
})
