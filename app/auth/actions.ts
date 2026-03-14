'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getClientLoginUrl, getPasswordRedirectUrl } from '@/utils/auth-urls'
import { assertSameOrigin } from '@/utils/security/origin'
import {
  clearAuthHandoffCookie,
  getAuthHandoffUrl,
  isAuthHandoffConfigured,
  usesSameOriginAuthHandoff,
  writeAuthHandoffCookie,
} from '@/utils/auth-handoff'
import {
  activatePortalMembershipIfInvited,
  resolveUserEntitlements,
} from '@/utils/auth-entitlements'
import { clearPortalAdminBypassCookies } from '@/utils/portal-bypass-session'
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
  void surface
  return '/client-login'
}

function getPostLoginPath(surface: Exclude<AuthSurface, 'client'>) {
  return surface === 'admin' ? '/dashboard' : '/portal'
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
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || !isAuthHandoffConfigured()) {
    redirectToSurface(surface, { error: 'handoff_unavailable' })
  }

  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirectToSurface(surface, { error: error.message })
  }

  const user = data.user
  const session = data.session
  if (!user) {
    redirectToSurface(surface, { error: 'unauthorized' })
  }
  if (!session?.access_token || !session.refresh_token) {
    redirectToSurface(surface, { error: 'session_transfer_failed' })
  }

  const entitlements = await resolveUserEntitlements(user.id, user.email)
  if (!entitlements.adminClientAvailable) {
    redirectToSurface(surface, { error: 'missing_service_role' })
  }

  async function completeSameOriginSignIn(targetSurface: 'admin' | 'portal') {
    const serverSupabase = await createClient()
    const { error: setSessionError } = await serverSupabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })

    if (setSessionError) {
      redirectToSurface(surface, { error: 'session_transfer_failed' })
    }

    revalidatePath('/', 'layout')
    redirect(getPostLoginPath(targetSurface))
  }

  if (allowAdmin && entitlements.bootstrapInternalRole) {
    const adminClient = createAdminClient()
    if (adminClient) {
      await adminClient.from('profiles').upsert(
        {
          user_id: user.id,
          role: 'admin',
          portal_admin_access: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }
  }

  if (allowAdmin && entitlements.internalRole) {
    if (usesSameOriginAuthHandoff()) {
      await completeSameOriginSignIn('admin')
    }

    const wroteCookie = await writeAuthHandoffCookie({
      surface: 'admin',
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    })
    if (!wroteCookie) {
      redirectToSurface(surface, { error: 'handoff_unavailable' })
    }
    revalidatePath('/', 'layout')
    redirect(getAuthHandoffUrl('admin'))
  }

  if (allowPortal && entitlements.portalMembership) {
    if (entitlements.portalMembership.status === 'invited') {
      await activatePortalMembershipIfInvited(entitlements.portalMembership.id, user.id)
    }

    if (usesSameOriginAuthHandoff()) {
      await completeSameOriginSignIn('portal')
    }

    const wroteCookie = await writeAuthHandoffCookie({
      surface: 'portal',
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    })
    if (!wroteCookie) {
      redirectToSurface(surface, { error: 'handoff_unavailable' })
    }
    revalidatePath('/', 'layout')
    redirect(getAuthHandoffUrl('portal'))
  }

  redirectToSurface(surface, { error: 'forbidden' })
}

export async function login(formData: FormData) {
  const surface = resolveAuthSurface(formData.get('surface'), 'admin')
  await ensureSameOrigin(`${getSurfaceLoginPath(surface)}?error=invalid_origin`)
  await signInAndRoute(formData, { surface, allowAdmin: true, allowPortal: true })
}

export async function portalLogin(formData: FormData) {
  await login(formData)
}

export async function signup(formData: FormData) {
  await ensureSameOrigin('/client-login?error=invalid_origin')
  void formData
  redirect('/client-login?error=' + encodeURIComponent('Account creation is invite-only.'))
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
  await ensureSameOrigin('/client-login?error=invalid_origin')
  const supabase = await createClient()
  await supabase.auth.signOut()
  await clearPortalAdminBypassCookies(PORTAL_ORG_COOKIE)
  await clearAuthHandoffCookie()
  revalidatePath('/', 'layout')
  redirect(getClientLoginUrl())
}

export async function portalLogout() {
  await ensureSameOrigin('/client-login?error=invalid_origin')
  const supabase = await createClient()
  await supabase.auth.signOut()
  await clearPortalAdminBypassCookies(PORTAL_ORG_COOKIE)
  await clearAuthHandoffCookie()
  revalidatePath('/', 'layout')
  redirect(getClientLoginUrl())
}
