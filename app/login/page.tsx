import { redirect } from 'next/navigation'
import { getClientLoginUrl } from '@/utils/auth-urls'

// Compatibility alias. Canonical auth entrypoint is /client-login.
export default async function LoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; reset_error?: string }>
}) {
  const params = await searchParams
  redirect(getClientLoginUrl(params))
}
