import { getConfiguredHosts, isLocalHost } from '@/utils/hosts'

const DEFAULT_ORIGINS = new Set(['http://localhost:3000', 'http://localhost:3001'])

function normalizeOrigin(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}`.toLowerCase()
  } catch {
    return null
  }
}

function normalizeHost(value: string | null) {
  return value?.trim().toLowerCase().replace(/:\d+$/, '') ?? null
}

function getHostOrigins(host: string | null) {
  const normalizedHost = normalizeHost(host)
  if (!normalizedHost) return []

  if (isLocalHost(normalizedHost) || normalizedHost.endsWith('.localhost')) {
    return [`http://${normalizedHost}`, `https://${normalizedHost}`]
  }

  return [`https://${normalizedHost}`]
}

export function getAllowedOrigins() {
  const allowed = new Set<string>(DEFAULT_ORIGINS)

  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, '')
  const vercelRuntime = process.env.VERCEL_URL?.trim().replace(/\/$/, '')

  if (explicit) allowed.add(explicit)
  if (vercelProduction) allowed.add(`https://${vercelProduction}`)
  if (vercelRuntime) allowed.add(`https://${vercelRuntime}`)

  const { publicHost, adminHost, portalHost } = getConfiguredHosts()
  if (publicHost) allowed.add(`https://${publicHost}`)
  if (adminHost) allowed.add(`https://${adminHost}`)
  if (portalHost) allowed.add(`https://${portalHost}`)

  return allowed
}

export function isAllowedRequestOrigin(
  reqHeaders: Pick<Headers, 'get'>,
  options?: { requireOrigin?: boolean }
) {
  const origin = normalizeOrigin(reqHeaders.get('origin'))
  const host = reqHeaders.get('x-forwarded-host') ?? reqHeaders.get('host')
  const allowed = getAllowedOrigins()

  if (origin) {
    return allowed.has(origin)
  }

  if (options?.requireOrigin) {
    return false
  }

  return getHostOrigins(host).some((candidate) => allowed.has(candidate))
}
