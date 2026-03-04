import { getAdminBaseUrl, getPortalBaseUrl } from '@/utils/hosts'

export function getPasswordRedirectUrl(
  mode: 'set' | 'reset',
  audience: 'admin' | 'portal' = 'admin'
): string {
  const destination = mode === 'set' ? '/set-password' : '/reset-password'
  const base = audience === 'portal' ? getPortalBaseUrl() : getAdminBaseUrl()
  return `${base}${destination}`
}
