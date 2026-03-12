import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'
import { getAdminBaseUrl, getConfiguredHosts, getPortalBaseUrl, getPublicBaseUrl, isLocalHost } from '@/utils/hosts'

export type AuthHandoffSurface = 'admin' | 'portal'

type AuthHandoffPayload = {
  kind: 'auth_handoff'
  surface: AuthHandoffSurface
  accessToken: string
  refreshToken: string
  redirectPath: '/dashboard' | '/portal'
  issuedAt: number
  expiresAt: number
}

const AUTH_HANDOFF_COOKIE = 'lq_auth_handoff'
const AUTH_HANDOFF_TTL_SECONDS = 60

function getHandoffSecret() {
  const value =
    process.env.AUTH_HANDOFF_SECRET?.trim() ||
    process.env.REPORT_ACCESS_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ''

  return value || null
}

function getHandoffKey() {
  const secret = getHandoffSecret()
  if (!secret) return null
  return crypto.createHash('sha256').update(secret).digest()
}

function getExplicitSharedCookieDomain() {
  return process.env.AUTH_SHARED_COOKIE_DOMAIN?.trim().replace(/^\./, '') || null
}

export function usesSameOriginAuthHandoff() {
  const { publicHost, adminHost, portalHost } = getConfiguredHosts()
  const hosts = [publicHost, adminHost, portalHost].filter((value): value is string => Boolean(value))
  if (hosts.length === 0) return true
  if (hosts.some((host) => isLocalHost(host) || host.endsWith('.localhost'))) return true
  return new Set(hosts).size <= 1
}

function requiresSharedCookieDomain() {
  return !usesSameOriginAuthHandoff()
}

function getSharedCookieDomain() {
  if (usesSameOriginAuthHandoff()) {
    return null
  }

  return getExplicitSharedCookieDomain()
}

function getAuthHandoffCookieOptions(maxAge: number) {
  const domain = getSharedCookieDomain()

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
    ...(domain ? { domain } : {}),
  }
}

function encodePayload(payload: AuthHandoffPayload) {
  const key = getHandoffKey()
  if (!key) return null

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString('base64url')
}

function decodePayload(value: string) {
  const key = getHandoffKey()
  if (!key) return null

  try {
    const buffer = Buffer.from(value, 'base64url')
    const iv = buffer.subarray(0, 12)
    const authTag = buffer.subarray(12, 28)
    const encrypted = buffer.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    const parsed = JSON.parse(decrypted) as AuthHandoffPayload

    if (parsed.kind !== 'auth_handoff') return null
    if (parsed.surface !== 'admin' && parsed.surface !== 'portal') return null
    if (parsed.redirectPath !== '/dashboard' && parsed.redirectPath !== '/portal') return null
    if (typeof parsed.expiresAt !== 'number' || Date.now() > parsed.expiresAt) return null
    if (!parsed.accessToken || !parsed.refreshToken) return null

    return parsed
  } catch {
    return null
  }
}

async function getCookieStore() {
  return cookies()
}

export function isAuthHandoffConfigured() {
  if (!getHandoffKey()) return false
  if (requiresSharedCookieDomain() && !getSharedCookieDomain()) return false
  return true
}

export async function clearAuthHandoffCookie() {
  const cookieStore = await getCookieStore()
  cookieStore.set(AUTH_HANDOFF_COOKIE, '', getAuthHandoffCookieOptions(0))
}

export async function writeAuthHandoffCookie(input: {
  surface: AuthHandoffSurface
  accessToken: string
  refreshToken: string
}) {
  const value = encodePayload({
    kind: 'auth_handoff',
    surface: input.surface,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    redirectPath: input.surface === 'admin' ? '/dashboard' : '/portal',
    issuedAt: Date.now(),
    expiresAt: Date.now() + AUTH_HANDOFF_TTL_SECONDS * 1000,
  })

  if (!value) {
    return false
  }

  const cookieStore = await getCookieStore()
  const domain = getSharedCookieDomain()
  if (requiresSharedCookieDomain() && !domain) {
    return false
  }
  cookieStore.set(AUTH_HANDOFF_COOKIE, value, getAuthHandoffCookieOptions(AUTH_HANDOFF_TTL_SECONDS))

  return true
}

export async function readAuthHandoffCookie() {
  const cookieStore = await getCookieStore()
  const rawValue = cookieStore.get(AUTH_HANDOFF_COOKIE)?.value
  if (!rawValue) return null
  return decodePayload(rawValue)
}

export function getAuthHandoffUrl(surface: AuthHandoffSurface) {
  const baseUrl = usesSameOriginAuthHandoff()
    ? getPublicBaseUrl()
    : surface === 'admin'
      ? getAdminBaseUrl()
      : getPortalBaseUrl()

  return new URL('/auth/handoff', baseUrl).toString()
}

export function getAuthHandoffDestinationUrl(
  surface: AuthHandoffSurface,
  redirectPath: '/dashboard' | '/portal'
) {
  const baseUrl = usesSameOriginAuthHandoff()
    ? getPublicBaseUrl()
    : surface === 'admin'
      ? getAdminBaseUrl()
      : getPortalBaseUrl()

  return new URL(redirectPath, baseUrl).toString()
}

export function clearAuthHandoffCookieOnResponse(response: NextResponse) {
  response.cookies.set(AUTH_HANDOFF_COOKIE, '', getAuthHandoffCookieOptions(0))
}
