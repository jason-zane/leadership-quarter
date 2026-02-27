'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getPasswordRedirectUrl } from '@/utils/auth-urls'
import { assertSameOrigin } from '@/utils/security/origin'

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

  // Backstop: ensure every authenticated user has a profile row even if DB trigger is missing.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const adminClient = createAdminClient()
    if (adminClient) {
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingProfile) {
        await adminClient.from('profiles').insert({
          user_id: user.id,
          role: 'staff',
          updated_at: new Date().toISOString(),
        })
      }
    }
  }

  const enforceTotp = process.env.ENFORCE_ADMIN_TOTP !== 'false'
  if (enforceTotp) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalData?.currentLevel !== 'aal2') {
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const hasVerifiedTotp = factorsData?.totp?.some((factor) => factor.status === 'verified') ?? false
      const dest = hasVerifiedTotp ? '/mfa/totp/verify' : '/mfa/totp/enroll'
      revalidatePath('/', 'layout')
      redirect(`${dest}?next=/dashboard`)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  ensureSameOrigin('/login?error=invalid_origin')
  void formData
  redirect('/login?error=' + encodeURIComponent('Account creation is invite-only.'))
}

export async function requestPasswordReset(formData: FormData) {
  ensureSameOrigin('/login?reset_error=invalid_origin')
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/login?reset_error=invalid_email')
  }

  let redirectTo: string
  try {
    redirectTo = getPasswordRedirectUrl('reset')
  } catch {
    redirect('/login?reset_error=site_url_not_configured')
  }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  redirect(
    '/login?message=' +
      encodeURIComponent('If that email is registered, a reset link has been sent.')
  )
}

export async function logout() {
  ensureSameOrigin('/login?error=invalid_origin')
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
