import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getClientLoginUrl } from '@/utils/auth-urls'
import {
  clearAuthHandoffCookie,
  clearAuthHandoffCookieOnResponse,
  getAuthHandoffDestinationUrl,
  readAuthHandoffCookie,
} from '@/utils/auth-handoff'
import { getConfiguredHosts, isLocalHost } from '@/utils/hosts'

function resolveRequestSurface(request: NextRequest) {
  const requestHost = (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '')
    .toLowerCase()
    .replace(/:\d+$/, '')

  if (!requestHost || isLocalHost(requestHost)) {
    return null
  }

  const { adminHost, portalHost } = getConfiguredHosts()
  if (adminHost && requestHost === adminHost) return 'admin'
  if (portalHost && requestHost === portalHost) return 'portal'
  return null
}

function redirectToClientLogin(error: string) {
  return NextResponse.redirect(new URL(getClientLoginUrl({ error })))
}

export async function GET(request: NextRequest) {
  const payload = await readAuthHandoffCookie()

  if (!payload) {
    await clearAuthHandoffCookie()
    return redirectToClientLogin('session_transfer_failed')
  }

  const requestSurface = resolveRequestSurface(request)
  if (requestSurface && requestSurface !== payload.surface) {
    await clearAuthHandoffCookie()
    return redirectToClientLogin('session_transfer_failed')
  }

  const redirectResponse = NextResponse.redirect(
    getAuthHandoffDestinationUrl(payload.surface, payload.redirectPath)
  )
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  const { error } = await supabase.auth.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
  })

  if (error) {
    clearAuthHandoffCookieOnResponse(redirectResponse)
    return redirectToClientLogin('session_transfer_failed')
  }

  clearAuthHandoffCookieOnResponse(redirectResponse)
  return redirectResponse
}
