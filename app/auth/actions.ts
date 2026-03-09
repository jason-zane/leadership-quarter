'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getPasswordRedirectUrl } from '@/utils/auth-urls'
import { getAdminBaseUrl, getPortalBaseUrl } from '@/utils/hosts'
import { assertSameOrigin } from '@/utils/security/origin'
import {
  activatePortalMembershipIfInvited,
  resolveUserEntitlements,
} from '@/utils/auth-entitlements'
import { PORTAL_ORG_COOKIE } from '@/utils/portal-context'

type AuthSurface = 'admin' | 'client' | 'portal'
type ResetAudience = 'admin' | 'portal'

async function ensureSameOrigin(fallback: string) {
  try {
    await assertSameOrigin()
  } catch {
    redirect(fallback)
  }
}

function resolveAuthSurface(value: FormDataEntryValue | null | undefined, fallback: AuthSurface): AuthSurface {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()

  if (normalized === 'admin' || normalized === 'client' || normalized === 'portal') {
    return normalized
  }

  return fallback
}

function resolveResetAudience(value: FormDataEntryValue | null | undefined): ResetAudience {
  return String(value ?? '').trim().toLowerCase() === 'portal' ? 'portal' : 'admin'
}

function getSurfaceLoginPath(surface: AuthSurface) {
  if (surface === 'client') return '/client-login'
  if (surface === 'portal') return '/portal/login'
  return '/login'
}

function redirectToSurface(
  surface: AuthSurface,
  params?: Partial<Record<'error' | 'message' | 'reset_error', string>>
): never {
  const path = getSurfaceLoginPath(surface)
  if (!params) {
    redirect(path)
  }

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value)
    }
  }

  const query = searchParams.toString()
  redirect(query ? `${path}?${query}` : path)
}

async function signInAndRoute(
  formData: FormData,
  options: {
    surface: AuthSurface
    allowAdmin: boolean
    allowPortal: boolean
  }
) {
  const { surface, allowAdmin, allowPortal } = options
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirectToSurface(surface, { error: error.message })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirectToSurface(surface, { error: 'unauthorized' })
  }

  const entitlements = await resolveUserEntitlements(user.id, user.email)
  if (!entitlements.adminClientAvailable) {
    await supabase.auth.signOut()
    redirectToSurface(surface, { error: 'missing_service_role' })
  }

  if (allowAdmin && entitlements.bootstrapInternalRole) {
    const adminClient = createAdminClient()
    if (adminClient) {
      await adminClient.from('profiles').upsert(
        {
          user_id: user.id,
          role: 'admin',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }
  }

  if (allowAdmin && entitlements.internalRole) {
    revalidatePath('/', 'layout')
    redirect(`${getAdminBaseUrl()}/dashboard`)
  }

  if (allowPortal && entitlements.portalMembership) {
    if (entitlements.portalMembership.status === 'invited') {
      await activatePortalMembershipIfInvited(entitlements.portalMembership.id, user.id)
    }
    revalidatePath('/', 'layout')
    redirect(`${getPortalBaseUrl()}/portal`)
  }

  await supabase.auth.signOut()
  redirectToSurface(surface, { error: 'forbidden' })
}

export async function login(formData: FormData) {
  const surface = resolveAuthSurface(formData.get('surface'), 'admin')
  await ensureSameOrigin(`${getSurfaceLoginPath(surface)}?error=invalid_origin`)
  await signInAndRoute(formData, { surface, allowAdmin: true, allowPortal: true })
}

export async function portalLogin(formData: FormData) {
  const surface = resolveAuthSurface(formData.get('surface'), 'portal')
  await ensureSameOrigin(`${getSurfaceLoginPath(surface)}?error=invalid_origin`)
  await signInAndRoute(formData, { surface, allowAdmin: false, allowPortal: true })
}

export async function signup(formData: FormData) {
  await ensureSameOrigin('/login?error=invalid_origin')
  void formData
  redirect('/login?error=' + encodeURIComponent('Account creation is invite-only.'))
}

export async function requestPasswordReset(formData: FormData) {
  const audience = resolveResetAudience(formData.get('audience'))
  const surface = resolveAuthSurface(formData.get('surface'), audience === 'portal' ? 'portal' : 'admin')
  await ensureSameOrigin(`${getSurfaceLoginPath(surface)}?reset_error=invalid_origin`)
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectToSurface(surface, { reset_error: 'invalid_email' })
  }

  let redirectTo: string
  try {
    redirectTo = getPasswordRedirectUrl('reset', audience)
  } catch {
    redirectToSurface(surface, { reset_error: 'site_url_not_configured' })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  if (error) {
    const message = error.message.toLowerCase()
    const resetErrorCode = message.includes('redirect')
      ? 'redirect_not_allowed'
      : message.includes('rate limit') || message.includes('too many')
        ? 'rate_limited'
        : message.includes('smtp') || message.includes('email provider')
          ? 'email_provider_failed'
          : 'send_failed'
    redirectToSurface(surface, { reset_error: resetErrorCode })
  }

  redirectToSurface(surface, {
    message: 'If that email is registered, a reset link has been sent.',
  })
}

export async function logout() {
  await ensureSameOrigin('/login?error=invalid_origin')
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(`${getAdminBaseUrl()}/login`)
}

export async function portalLogout() {
  await ensureSameOrigin('/portal/login?error=invalid_origin')
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(PORTAL_ORG_COOKIE)
  revalidatePath('/', 'layout')
  redirect(`${getPortalBaseUrl()}/portal/login`)
}
