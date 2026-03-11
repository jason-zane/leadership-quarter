import { redirect } from 'next/navigation'
import { getClientLoginUrl } from '@/utils/auth-urls'

export default async function LoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; reset_error?: string }>
}) {
  const params = await searchParams
  redirect(getClientLoginUrl(params))
}
