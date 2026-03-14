import crypto from 'node:crypto'
import type { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const PORTAL_ADMIN_BYPASS_COOKIE = 'lq_portal_bypass'
export const PORTAL_ADMIN_BYPASS_TTL_SECONDS = 60 * 60

type PortalAdminBypassPayload = {
  kind: 'portal_admin_bypass'
  userId: string
  organisationId: string
  issuedAt: number
  expiresAt: number
}

function getPortalBypassSecret() {
  return (
    process.env.PORTAL_ADMIN_BYPASS_SECRET?.trim()
    || process.env.AUTH_HANDOFF_SECRET?.trim()
    || process.env.REPORT_ACCESS_TOKEN_SECRET?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || null
  )
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
    expiresAt: now + (input.expiresInSeconds ?? PORTAL_ADMIN_BYPASS_TTL_SECONDS) * 1000,
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

  response.cookies.set(PORTAL_ADMIN_BYPASS_COOKIE, token, getCookieOptions(PORTAL_ADMIN_BYPASS_TTL_SECONDS))
  response.cookies.set(input.organisationCookieName, input.organisationId, getCookieOptions(PORTAL_ADMIN_BYPASS_TTL_SECONDS))
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
