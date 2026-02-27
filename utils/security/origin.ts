import { headers } from 'next/headers'

const DEFAULT_ORIGINS = new Set(['http://localhost:3000'])

function normalizeOrigin(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}`.toLowerCase()
  } catch {
    return null
  }
}

export function getAllowedOrigins() {
  const allowed = new Set<string>(DEFAULT_ORIGINS)

  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, '')
  const vercelRuntime = process.env.VERCEL_URL?.trim().replace(/\/$/, '')

  if (explicit) allowed.add(explicit)
  if (vercelProduction) allowed.add(`https://${vercelProduction}`)
  if (vercelRuntime) allowed.add(`https://${vercelRuntime}`)

  return allowed
}

export async function assertSameOrigin() {
  const reqHeaders = await headers()
  const origin = normalizeOrigin(reqHeaders.get('origin'))
  const host = reqHeaders.get('host')
  const hostOrigin = host ? normalizeOrigin(`https://${host}`) : null

  const allowed = getAllowedOrigins()

  if (origin && allowed.has(origin)) {
    return
  }

  if (!origin && hostOrigin && allowed.has(hostOrigin)) {
    return
  }

  throw new Error('invalid_origin')
}
