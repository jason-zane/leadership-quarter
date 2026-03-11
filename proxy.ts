import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { getAdminBaseUrl, getConfiguredHosts, getPortalBaseUrl, getPublicBaseUrl, isLocalHost } from '@/utils/hosts'
import {
  checkRateLimit,
  getClientIp,
  getPublicRateLimitConfig,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'

function generateNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function buildCsp(nonce: string) {
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    'https://www.googletagmanager.com',
    'https://va.vercel-scripts.com',
  ]
  if (isDev) {
    scriptSrc.push("'unsafe-eval'")
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "img-src 'self' data: https://images.unsplash.com https://i.ytimg.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    `script-src ${scriptSrc.join(' ')}`,
    "script-src-attr 'none'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    "report-uri /api/csp-report",
  ].join('; ')
}

export function preScreenApiRequest(request: NextRequest, csp?: string) {
  const path = request.nextUrl.pathname

  function buildApiError(status: number, error: string) {
    const headers = new Headers({
      'Cache-Control': 'no-store',
    })
    if (csp) {
      headers.set('Content-Security-Policy', csp)
    }
    return NextResponse.json({ ok: false, error }, { status, headers })
  }

  if (path.startsWith('/api/admin/') || path.startsWith('/api/portal/')) {
    const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.includes('-auth-token'))
    if (!hasAuthCookie) {
      return buildApiError(401, 'unauthorized')
    }
  }

  if (path.startsWith('/api/cron/')) {
    const auth = request.headers.get('authorization') ?? request.headers.get('x-cron-secret')
    if (!auth) {
      return buildApiError(401, 'unauthorized')
    }
  }

  return undefined
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const nonce = generateNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  const csp = buildCsp(nonce)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  supabaseResponse.headers.set('Content-Security-Policy', csp)

  const requestHostHeader = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const requestHost = requestHostHeader?.toLowerCase().replace(/:\d+$/, '') ?? null
  const { publicHost, adminHost, portalHost } = getConfiguredHosts()
  const localRequest = isLocalHost(requestHost)
  const path = request.nextUrl.pathname
  const queryType = request.nextUrl.searchParams.get('type')
  const hasAuthQuery =
    request.nextUrl.searchParams.has('code') ||
    request.nextUrl.searchParams.has('token_hash') ||
    request.nextUrl.searchParams.has('access_token') ||
    request.nextUrl.searchParams.has('refresh_token')
  const preScreenResponse = preScreenApiRequest(request, csp)
  if (preScreenResponse) {
    return preScreenResponse
  }

  function buildHostRedirect(baseUrl: string, forcedPathname?: string, keepSearch = false) {
    const target = new URL(request.url)
    const base = new URL(baseUrl)
    target.protocol = base.protocol
    target.host = base.host
    if (forcedPathname) {
      target.pathname = forcedPathname
      if (!keepSearch) {
        target.search = ''
      }
    }
    const redirectResponse = NextResponse.redirect(target)
    redirectResponse.headers.set('Content-Security-Policy', csp)
    return redirectResponse
  }

  function surfaceForPath(pathname: string): 'admin' | 'portal' | null {
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/api/admin')
    ) {
      return 'admin'
    }
    if (
      pathname.startsWith('/portal') ||
      pathname.startsWith('/api/portal')
    ) {
      return 'portal'
    }
    if (pathname === '/reset-password' || pathname === '/set-password') {
      return null
    }
    return null
  }

  if (!localRequest && requestHost && adminHost && portalHost) {
    if (
      path === '/login' ||
      path === '/portal/login' ||
      (path === '/client-login' && (requestHost === adminHost || requestHost === portalHost))
    ) {
      return buildHostRedirect(getPublicBaseUrl(), '/client-login', true)
    }

    // Catch obvious host typos (for example admin.layershipquarter.com) and move to canonical host.
    if (requestHost.startsWith('admin.') && requestHost !== adminHost) {
      return buildHostRedirect(getAdminBaseUrl())
    }
    if (requestHost.startsWith('portal.') && requestHost !== portalHost) {
      return buildHostRedirect(getPortalBaseUrl())
    }

    const targetSurface = surfaceForPath(path)
    if (targetSurface === 'admin' && requestHost !== adminHost) {
      return buildHostRedirect(getAdminBaseUrl())
    }
    if (targetSurface === 'portal' && requestHost !== portalHost) {
      return buildHostRedirect(getPortalBaseUrl())
    }

    if (publicHost && requestHost === publicHost && targetSurface) {
      return buildHostRedirect(targetSurface === 'admin' ? getAdminBaseUrl() : getPortalBaseUrl())
    }

    // If Supabase auth query params land on root, recover to the proper password page.
    if (path === '/' && hasAuthQuery) {
      const redirectPath =
        queryType === 'recovery' ? '/reset-password' : queryType === 'invite' ? '/set-password' : '/reset-password'
      if (requestHost === adminHost) {
        return buildHostRedirect(getAdminBaseUrl(), redirectPath, true)
      }
      if (requestHost === portalHost) {
        return buildHostRedirect(getPortalBaseUrl(), redirectPath, true)
      }
      if (publicHost && requestHost === publicHost) {
        // Prefer admin host as fallback if token arrives on public host.
        return buildHostRedirect(getAdminBaseUrl(), redirectPath, true)
      }
    }

    // On subdomain roots, send unauthenticated users back through the canonical public login.
    if (path === '/' && requestHost === adminHost) {
      return buildHostRedirect(getPublicBaseUrl(), '/client-login')
    }
    if (path === '/' && requestHost === portalHost) {
      return buildHostRedirect(getPublicBaseUrl(), '/client-login')
    }
    if (path === '/auth/handoff' && publicHost && requestHost === publicHost) {
      return buildHostRedirect(getPublicBaseUrl(), '/client-login', true)
    }
  }

  const publicRateLimitConfig =
    process.env.NODE_ENV === 'production' &&
    !localRequest &&
    path !== '/favicon.ico' &&
    requestHost !== adminHost &&
    requestHost !== portalHost &&
    surfaceForPath(path) === null
      ? getPublicRateLimitConfig(request)
      : null

  if (publicRateLimitConfig) {
    const rateLimit = await checkRateLimit(
      `public:${publicRateLimitConfig.bucket}:${getClientIp(request)}`,
      publicRateLimitConfig.limit,
      publicRateLimitConfig.windowSeconds,
      { prefix: 'lq:root-rl' }
    )

    if (rateLimit.pending) {
      event.waitUntil(rateLimit.pending)
    }

    if (!rateLimit.allowed) {
      logRateLimitExceededForRequest({
        request,
        route: path,
        scope: 'public',
        bucket: publicRateLimitConfig.bucket,
        identifierType: 'ip',
        identifier: getClientIp(request),
        result: rateLimit,
        source: 'proxy',
      })

      const headers = getRateLimitHeaders(rateLimit)
      headers.set('Cache-Control', 'no-store')
      headers.set('Content-Security-Policy', csp)

      if (path.startsWith('/api/')) {
        return NextResponse.json(
          { ok: false, error: 'rate_limited' },
          { status: 429, headers }
        )
      }

      headers.set('Content-Type', 'text/plain; charset=utf-8')
      return new NextResponse('Too many requests. Please try again shortly.', {
        status: 429,
        headers,
      })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
        supabaseResponse.headers.set('Content-Security-Policy', csp)
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: do not add logic between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Session-aware root routing on dedicated subdomains.
  if (!localRequest && requestHost && adminHost && portalHost && path === '/') {
    if (requestHost === adminHost) {
      return buildHostRedirect(getAdminBaseUrl(), user ? '/dashboard' : '/login')
    }
    if (requestHost === portalHost) {
      return buildHostRedirect(getPortalBaseUrl(), user ? '/portal' : '/portal/login')
    }
  }

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return buildHostRedirect(getAdminBaseUrl(), '/login')
  }

  if (!user && request.nextUrl.pathname.startsWith('/portal') && request.nextUrl.pathname !== '/portal/login') {
    return buildHostRedirect(getPortalBaseUrl(), '/portal/login')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
