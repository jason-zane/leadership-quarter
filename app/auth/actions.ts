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

function ensureSameOrigin(fallback: string) {
  try {
    assertSameOrigin()
  } catch {
    redirect(fallback)
  }
}

export async function login(formData: FormData) {
  ensureSameOrigin('/login?error=invalid_origin')
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
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?error=unauthorized')
  }

  const entitlements = await resolveUserEntitlements(user.id, user.email)
  if (!entitlements.adminClientAvailable) {
    await supabase.auth.signOut()
    redirect('/login?error=missing_service_role')
  }

  if (entitlements.bootstrapInternalRole) {
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

  if (entitlements.internalRole) {
    revalidatePath('/', 'layout')
    redirect(`${getAdminBaseUrl()}/dashboard`)
  }

  if (entitlements.portalMembership) {
    if (entitlements.portalMembership.status === 'invited') {
      await activatePortalMembershipIfInvited(entitlements.portalMembership.id, user.id)
    }
    revalidatePath('/', 'layout')
    redirect(`${getPortalBaseUrl()}/portal`)
  }

  await supabase.auth.signOut()
  redirect('/login?error=forbidden')
}

export async function portalLogin(formData: FormData) {
  ensureSameOrigin('/portal/login?error=invalid_origin')
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
    redirect('/portal/login?error=' + encodeURIComponent(error.message))
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/portal/login?error=unauthorized')
  }

  const entitlements = await resolveUserEntitlements(user.id, user.email)
  if (!entitlements.adminClientAvailable) {
    await supabase.auth.signOut()
    redirect('/portal/login?error=missing_service_role')
  }

  if (entitlements.portalMembership) {
    if (entitlements.portalMembership.status === 'invited') {
      await activatePortalMembershipIfInvited(entitlements.portalMembership.id, user.id)
    }
    revalidatePath('/', 'layout')
    redirect(`${getPortalBaseUrl()}/portal`)
  }

  await supabase.auth.signOut()
  redirect('/portal/login?error=forbidden')
}

export async function signup(formData: FormData) {
  ensureSameOrigin('/login?error=invalid_origin')
  void formData
  redirect('/login?error=' + encodeURIComponent('Account creation is invite-only.'))
}

export async function requestPasswordReset(formData: FormData) {
  const audience = String(formData.get('audience') ?? 'admin').trim() === 'portal' ? 'portal' : 'admin'
  ensureSameOrigin(
    audience === 'portal' ? '/portal/login?reset_error=invalid_origin' : '/login?reset_error=invalid_origin'
  )
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(
      audience === 'portal' ? '/portal/login?reset_error=invalid_email' : '/login?reset_error=invalid_email'
    )
  }

  let redirectTo: string
  try {
    redirectTo = getPasswordRedirectUrl('reset', audience)
  } catch {
    redirect(
      audience === 'portal'
        ? '/portal/login?reset_error=site_url_not_configured'
        : '/login?reset_error=site_url_not_configured'
    )
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
    redirect(
      audience === 'portal'
        ? `/portal/login?reset_error=${resetErrorCode}`
        : `/login?reset_error=${resetErrorCode}`
    )
  }

  const message =
    encodeURIComponent('If that email is registered, a reset link has been sent.')
  redirect(audience === 'portal' ? `/portal/login?message=${message}` : `/login?message=${message}`)
}

export async function logout() {
  ensureSameOrigin('/login?error=invalid_origin')
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect(`${getAdminBaseUrl()}/login`)
}

export async function portalLogout() {
  ensureSameOrigin('/portal/login?error=invalid_origin')
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(PORTAL_ORG_COOKIE)
  revalidatePath('/', 'layout')
  redirect(`${getPortalBaseUrl()}/portal/login`)
}
