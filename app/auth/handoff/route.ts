import { NextRequest, NextResponse } from 'next/server'
import { getClientLoginUrl } from '@/utils/auth-urls'
import { clearAuthHandoffCookie, readAuthHandoffCookie } from '@/utils/auth-handoff'
import { getConfiguredHosts, getAdminBaseUrl, getPortalBaseUrl, isLocalHost } from '@/utils/hosts'
import { createClient } from '@/utils/supabase/server'

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

  const supabase = await createClient()
  const { error } = await supabase.auth.setSession({
    access_token: payload.accessToken,
    refresh_token: payload.refreshToken,
  })

  await clearAuthHandoffCookie()

  if (error) {
    return redirectToClientLogin('session_transfer_failed')
  }

  const destinationBaseUrl = payload.surface === 'admin' ? getAdminBaseUrl() : getPortalBaseUrl()
  return NextResponse.redirect(new URL(payload.redirectPath, destinationBaseUrl))
}
