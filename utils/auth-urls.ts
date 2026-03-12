import { getPublicBaseUrl } from '@/utils/hosts'

type ClientLoginQuery = Partial<Record<'error' | 'message' | 'reset_error', string>>

function withQuery(path: string, params?: ClientLoginQuery) {
  if (!params) return path

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value)
    }
  }

  const query = searchParams.toString()
  return query ? `${path}?${query}` : path
}

export function getClientLoginPath(params?: ClientLoginQuery) {
  return withQuery('/client-login', params)
}

export function getClientLoginUrl(params?: ClientLoginQuery) {
  return `${getPublicBaseUrl()}${getClientLoginPath(params)}`
}

export function getPasswordRedirectUrl(
  mode: 'set' | 'reset',
  audience: 'admin' | 'portal' = 'admin'
): string {
  void audience
  const destination = mode === 'set' ? '/set-password' : '/reset-password'
  return `${getPublicBaseUrl()}${destination}`
}
