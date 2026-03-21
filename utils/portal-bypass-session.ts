import crypto from 'node:crypto'
import type { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { portalBypassTtlSeconds } from '@/utils/services/platform-settings-runtime'

export const PORTAL_ADMIN_BYPASS_COOKIE = 'lq_portal_bypass'

type PortalAdminBypassPayload = {
  kind: 'portal_admin_bypass'
  userId: string
  organisationId: string
  issuedAt: number
  expiresAt: number
}

function getPortalBypassSecret() {
  const dedicated = process.env.PORTAL_ADMIN_BYPASS_SECRET?.trim()
  if (dedicated) return dedicated

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'PORTAL_ADMIN_BYPASS_SECRET must be set in production. ' +
      'Refusing to fall back to other secrets for HMAC signing.'
    )
  }

  // Dev/test fallback — never use the service role key as HMAC material
  const fallback =
    process.env.AUTH_HANDOFF_SECRET?.trim()
    || process.env.REPORT_ACCESS_TOKEN_SECRET?.trim()
    || null

  if (fallback) {
    console.warn('[portal-bypass] PORTAL_ADMIN_BYPASS_SECRET not set — falling back to secondary secret. Set it before deploying to production.')
  }

  return fallback
}

function sign(value: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url')
}

function getCookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  }
}

export function createPortalAdminBypassToken(input: {
  userId: string
  organisationId: string
  expiresInSeconds?: number
}) {
  const secret = getPortalBypassSecret()
  if (!secret) return null

  const now = Date.now()
  const payload: PortalAdminBypassPayload = {
    kind: 'portal_admin_bypass',
    userId: input.userId,
    organisationId: input.organisationId,
    issuedAt: now,
    expiresAt: now + (input.expiresInSeconds ?? portalBypassTtlSeconds()) * 1000,
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = sign(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

export function verifyPortalAdminBypassToken(
  token: string,
  input: { userId: string; organisationId?: string | null }
) {
  const secret = getPortalBypassSecret()
  if (!secret) return null

  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) return null

  const expectedSignature = sign(payloadBase64, secret)
  const provided = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8')) as PortalAdminBypassPayload
    if (
      payload.kind !== 'portal_admin_bypass'
      || payload.userId !== input.userId
      || typeof payload.organisationId !== 'string'
      || !payload.organisationId
      || typeof payload.expiresAt !== 'number'
      || Date.now() > payload.expiresAt
    ) {
      return null
    }

    if (input.organisationId && payload.organisationId !== input.organisationId) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function writePortalAdminBypassCookies(
  response: NextResponse,
  input: {
    userId: string
    organisationId: string
    organisationCookieName: string
  }
) {
  const token = createPortalAdminBypassToken({
    userId: input.userId,
    organisationId: input.organisationId,
  })
  if (!token) {
    return false
  }

  response.cookies.set(PORTAL_ADMIN_BYPASS_COOKIE, token, getCookieOptions(portalBypassTtlSeconds()))
  response.cookies.set(input.organisationCookieName, input.organisationId, getCookieOptions(portalBypassTtlSeconds()))
  return true
}

export async function clearPortalAdminBypassCookies(organisationCookieName: string) {
  const cookieStore = await cookies()
  cookieStore.set(PORTAL_ADMIN_BYPASS_COOKIE, '', getCookieOptions(0))
  cookieStore.set(organisationCookieName, '', getCookieOptions(0))
}

export function clearPortalAdminBypassCookiesOnResponse(
  response: NextResponse,
  organisationCookieName: string
) {
  response.cookies.set(PORTAL_ADMIN_BYPASS_COOKIE, '', getCookieOptions(0))
  response.cookies.set(organisationCookieName, '', getCookieOptions(0))
}
