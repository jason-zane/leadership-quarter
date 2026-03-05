type Surface = 'public' | 'admin' | 'portal'

function normalizeHost(host: string | null | undefined) {
  if (!host) return null
  return host.toLowerCase().replace(/:\d+$/, '')
}

function normalizeUrl(url: string | null | undefined) {
  if (!url) return null
  const trimmed = url.trim().replace(/\/$/, '')
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const asHost = normalizeHost(trimmed)
  if (!asHost) return null
  if (isLocalHost(asHost)) return `http://${asHost}`
  return `https://${asHost}`
}

export function isLocalHost(host: string | null | undefined) {
  const normalized = normalizeHost(host)
  if (!normalized) return false
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]'
}

export function getConfiguredHosts() {
  const publicHost = normalizeHost(process.env.PUBLIC_HOST) ?? normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  const adminHost = normalizeHost(process.env.ADMIN_HOST)
  const portalHost = normalizeHost(process.env.PORTAL_HOST)

  return {
    publicHost,
    adminHost,
    portalHost,
  }
}

export function getBaseUrlForSurface(surface: Surface): string {
  const explicitPublic = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL)
  const explicitAdmin = normalizeUrl(process.env.ADMIN_BASE_URL)
  const explicitPortal = normalizeUrl(process.env.PORTAL_BASE_URL)
  const fallback = explicitPublic ?? 'http://localhost:3001'

  if (surface === 'public') {
    return explicitPublic ?? fallback
  }

  if (surface === 'admin') {
    if (explicitAdmin) return explicitAdmin
    const adminHost = getConfiguredHosts().adminHost
    if (adminHost) return `https://${adminHost}`
    return fallback
  }

  if (explicitPortal) return explicitPortal
  const portalHost = getConfiguredHosts().portalHost
  if (portalHost) return `https://${portalHost}`
  return fallback
}

export function getAdminBaseUrl() {
  return getBaseUrlForSurface('admin')
}

export function getPortalBaseUrl() {
  return getBaseUrlForSurface('portal')
}

export function getPublicBaseUrl() {
  return getBaseUrlForSurface('public')
}
