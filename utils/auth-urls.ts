export function getPasswordRedirectUrl(mode: 'set' | 'reset'): string {
  const destination = mode === 'set' ? '/set-password' : '/reset-password'
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, '')
  const vercelRuntimeUrl = process.env.VERCEL_URL?.trim().replace(/\/$/, '')
  const inProduction = process.env.NODE_ENV === 'production'

  const base =
    explicit ||
    (vercelProductionUrl ? `https://${vercelProductionUrl}` : null) ||
    (vercelRuntimeUrl ? `https://${vercelRuntimeUrl}` : null)

  if (!base && inProduction) {
    throw new Error('NEXT_PUBLIC_SITE_URL is required in production for auth redirects.')
  }

  return `${base ?? 'http://localhost:3000'}${destination}`
}
