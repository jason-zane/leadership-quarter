import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { getConfiguredHosts, isLocalHost } from '@/utils/hosts'

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

function getSharedCookieDomain() {
  const explicit = process.env.AUTH_SHARED_COOKIE_DOMAIN?.trim().replace(/^\./, '')
  if (explicit) return explicit

  const { publicHost, adminHost, portalHost } = getConfiguredHosts()
  const hosts = [publicHost, adminHost, portalHost].filter((value): value is string => Boolean(value))
  if (hosts.length === 0 || hosts.some((host) => isLocalHost(host))) {
    return null
  }

  const reversedParts = hosts.map((host) => host.split('.').reverse())
  const maxShared = Math.min(...reversedParts.map((parts) => parts.length))
  const shared: string[] = []

  for (let index = 0; index < maxShared; index += 1) {
    const candidate = reversedParts[0]?.[index]
    if (!candidate || reversedParts.some((parts) => parts[index] !== candidate)) {
      break
    }
    shared.push(candidate)
  }

  if (shared.length < 2) return null
  return shared.reverse().join('.')
}

function requiresSharedCookieDomain() {
  const { publicHost, adminHost, portalHost } = getConfiguredHosts()
  const hosts = [publicHost, adminHost, portalHost].filter((value): value is string => Boolean(value))
  if (hosts.length === 0) return false
  if (hosts.some((host) => isLocalHost(host))) return false
  return new Set(hosts).size > 1
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
  return Boolean(getHandoffKey())
}

export async function clearAuthHandoffCookie() {
  const cookieStore = await getCookieStore()
  const domain = getSharedCookieDomain()
  cookieStore.set(AUTH_HANDOFF_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    ...(domain ? { domain } : {}),
  })
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
  cookieStore.set(AUTH_HANDOFF_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_HANDOFF_TTL_SECONDS,
    ...(domain ? { domain } : {}),
  })

  return true
}

export async function readAuthHandoffCookie() {
  const cookieStore = await getCookieStore()
  const rawValue = cookieStore.get(AUTH_HANDOFF_COOKIE)?.value
  if (!rawValue) return null
  return decodePayload(rawValue)
}
