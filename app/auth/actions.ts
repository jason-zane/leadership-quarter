'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getPasswordRedirectUrl } from '@/utils/auth-urls'
import { assertSameOrigin } from '@/utils/security/origin'
import {
  activatePortalMembershipIfInvited,
  resolveUserEntitlements,
} from '@/utils/auth-entitlements'

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

  const entitlements = await resolveUserEntitlements(user.id)
  if (!entitlements.adminClientAvailable) {
    await supabase.auth.signOut()
    redirect('/login?error=missing_service_role')
  }

  if (entitlements.internalRole) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
  }

  if (entitlements.portalMembership) {
    if (entitlements.portalMembership.status === 'invited') {
      await activatePortalMembershipIfInvited(entitlements.portalMembership.id)
    }
    revalidatePath('/', 'layout')
    redirect('/portal')
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

  const entitlements = await resolveUserEntitlements(user.id)
  if (!entitlements.adminClientAvailable) {
    await supabase.auth.signOut()
    redirect('/portal/login?error=missing_service_role')
  }

  if (entitlements.portalMembership) {
    if (entitlements.portalMembership.status === 'invited') {
      await activatePortalMembershipIfInvited(entitlements.portalMembership.id)
    }
    revalidatePath('/', 'layout')
    redirect('/portal')
  }

  if (entitlements.internalRole) {
    revalidatePath('/', 'layout')
    redirect('/dashboard')
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
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  const message =
    encodeURIComponent('If that email is registered, a reset link has been sent.')
  redirect(audience === 'portal' ? `/portal/login?message=${message}` : `/login?message=${message}`)
}

export async function logout() {
  ensureSameOrigin('/login?error=invalid_origin')
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
