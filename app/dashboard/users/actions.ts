'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdminUser } from '@/utils/dashboard-auth'
import { getPasswordRedirectUrl } from '@/utils/auth-urls'
import { assertSameOrigin } from '@/utils/security/origin'
import {
  attachOrganisationMember,
  type PortalRole,
} from '@/utils/services/organisation-members'
import { allowedRoles as allowedPortalRoles } from '@/utils/services/organisation-members/types'

const allowedInternalRoles = new Set(['admin', 'staff'])
type AdminAction =
  | 'user_role_updated'
  | 'user_portal_admin_access_updated'
  | 'user_invited'
  | 'user_invite_role_updated'
  | 'user_password_reset_sent'
  | 'user_removed'

async function ensureAdmin() {
  try {
    assertSameOrigin()
  } catch {
    redirect('/dashboard?error=invalid_origin')
  }
  const auth = await requireAdminUser()
  if (!auth.authorized) {
    redirect('/dashboard')
  }
  return auth.user
}

function createPublicAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    return null
  }

  return createSupabaseClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function findAuthUserIdByEmail(email: string) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return null
  }

  const { data, error } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (error) {
    return null
  }

  const user = data.users.find((candidate) => (candidate.email ?? '').toLowerCase() === email)
  return user?.id ?? null
}

async function logAdminAction(input: {
  actorUserId: string
  action: AdminAction
  targetUserId?: string | null
  targetEmail?: string | null
  details?: Record<string, string | number | boolean | null>
}) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return
  }

  const { error } = await adminClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_user_id: input.targetUserId ?? null,
    target_email: input.targetEmail ?? null,
    details: input.details ?? {},
  })
  if (error) {
    console.error('admin_audit_logs insert failed:', error.message)
  }
}

export async function updateUserRole(formData: FormData) {
  const currentUser = await ensureAdmin()

  const userId = String(formData.get('user_id') ?? '').trim()
  const role = String(formData.get('role') ?? '').trim()

  if (!userId || !allowedInternalRoles.has(role)) {
    redirect('/dashboard/users?error=invalid_role')
  }
  if (currentUser.id === userId && role !== 'admin') {
    redirect('/dashboard/users?error=cannot_demote_self')
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect('/dashboard/users?error=missing_service_role')
  }

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from('profiles')
    .select('role, portal_admin_access')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingProfileError) {
    redirect('/dashboard/users?error=role_update_failed')
  }

  const portalAdminAccess =
    role === 'admin'
      ? existingProfile?.role === 'admin'
        ? existingProfile.portal_admin_access !== false
        : true
      : false

  const profilePatch =
    {
      user_id: userId,
      role,
      portal_admin_access: portalAdminAccess,
      updated_at: new Date().toISOString(),
    }

  const { error } = await adminClient.from('profiles').upsert(profilePatch, { onConflict: 'user_id' })

  if (error) {
    redirect('/dashboard/users?error=role_update_failed')
  }

  await logAdminAction({
    actorUserId: currentUser.id,
    action: 'user_role_updated',
    targetUserId: userId,
    details: { role },
  })

  revalidatePath('/dashboard/users')
  redirect('/dashboard/users?saved=1')
}

export async function togglePortalAdminAccess(formData: FormData) {
  const currentUser = await ensureAdmin()

  const userId = String(formData.get('user_id') ?? '').trim()
  const enabled = String(formData.get('enabled') ?? '').trim() === 'true'

  if (!userId) {
    redirect('/dashboard/users?error=invalid_user')
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect('/dashboard/users?error=missing_service_role')
  }

  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingProfile?.role !== 'admin') {
    redirect('/dashboard/users?error=portal_access_requires_admin_role')
  }

  const { error } = await adminClient
    .from('profiles')
    .update({
      portal_admin_access: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('role', 'admin')

  if (error) {
    redirect('/dashboard/users?error=portal_access_update_failed')
  }

  await logAdminAction({
    actorUserId: currentUser.id,
    action: 'user_portal_admin_access_updated',
    targetUserId: userId,
    details: {
      portal_admin_access: enabled,
    },
  })

  revalidatePath('/dashboard/users')
  redirect(`/dashboard/users?saved=${enabled ? 'portal_admin_access_enabled' : 'portal_admin_access_disabled'}`)
}

export async function inviteUser(formData: FormData) {
  const currentUser = await ensureAdmin()

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const role = String(formData.get('role') ?? 'staff').trim()
  const portalAdminAccessRequested =
    role === 'admin' && String(formData.get('portal_admin_access') ?? 'true').trim() !== 'false'

  if (!email || !allowedInternalRoles.has(role) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/dashboard/users?error=invalid_invite')
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect('/dashboard/users?error=missing_service_role')
  }

  const { data: listResult, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (listError) {
    redirect('/dashboard/users?error=invite_failed')
  }

  const existingUser = listResult.users.find((user) => (user.email ?? '').toLowerCase() === email)

  if (existingUser) {
    const { error: upsertExistingError } = await adminClient.from('profiles').upsert(
      {
        user_id: existingUser.id,
        role,
        portal_admin_access: role === 'admin' ? portalAdminAccessRequested : false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (upsertExistingError) {
      redirect('/dashboard/users?error=invite_failed')
    }

    revalidatePath('/dashboard/users')
    redirect('/dashboard/users?saved=role_only')
  }

  let inviteRedirectTo: string
  try {
    inviteRedirectTo = getPasswordRedirectUrl('set', 'admin')
  } catch {
    redirect('/dashboard/users?error=site_url_not_configured')
  }

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirectTo,
  })
  if (inviteError) {
    const message = inviteError.message.toLowerCase()
    const errorCode = message.includes('redirect')
      ? 'invite_redirect_not_allowed'
      : message.includes('smtp') || message.includes('email')
        ? 'invite_email_provider_failed'
        : 'invite_email_failed'
    redirect(`/dashboard/users?error=${errorCode}`)
  }

  const invitedUserId = invited.user?.id ?? (await findAuthUserIdByEmail(email))
  if (!invitedUserId) {
    redirect('/dashboard/users?error=invite_failed')
  }

  const { error: profileError } = await adminClient.from('profiles').upsert(
    {
      user_id: invitedUserId,
      role,
      portal_admin_access: role === 'admin' ? portalAdminAccessRequested : false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (profileError) {
    redirect('/dashboard/users?error=profile_failed')
  }

  await logAdminAction({
    actorUserId: currentUser.id,
    action: 'user_invited',
    targetUserId: invitedUserId,
    targetEmail: email,
    details: { role },
  })

  revalidatePath('/dashboard/users')
  redirect('/dashboard/users?saved=invited_set_sent')
}

export async function attachUserToClient(formData: FormData) {
  const currentUser = await ensureAdmin()

  const userId = String(formData.get('user_id') ?? '').trim()
  const organisationId = String(formData.get('organisation_id') ?? '').trim()
  const role = String(formData.get('portal_role') ?? '').trim() as PortalRole

  if (!userId || !organisationId || !allowedPortalRoles.has(role)) {
    redirect('/dashboard/users?error=invalid_client_membership')
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect('/dashboard/users?error=missing_service_role')
  }

  const result = await attachOrganisationMember({
    adminClient,
    actorUserId: currentUser.id,
    organisationId,
    payload: {
      role,
      userId,
    },
  })

  if (!result.ok) {
    redirect(`/dashboard/users?error=${result.error}`)
  }

  revalidatePath('/dashboard/users')
  revalidatePath(`/dashboard/clients/${organisationId}`)
  redirect('/dashboard/users?saved=client_membership_attached')
}

export async function sendPasswordResetEmail(formData: FormData) {
  const currentUser = await ensureAdmin()

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/dashboard/users?error=invalid_email')
  }

  const authClient = createPublicAuthClient()
  if (!authClient) {
    redirect('/dashboard/users?error=missing_public_supabase')
  }

  let resetRedirectTo: string
  try {
    resetRedirectTo = getPasswordRedirectUrl('reset', 'admin')
  } catch {
    redirect('/dashboard/users?error=site_url_not_configured')
  }

  const { error } = await authClient.auth.resetPasswordForEmail(email, {
    redirectTo: resetRedirectTo,
  })

  if (error) {
    redirect('/dashboard/users?error=password_reset_email_failed')
  }

  await logAdminAction({
    actorUserId: currentUser.id,
    action: 'user_password_reset_sent',
    targetEmail: email,
  })

  redirect('/dashboard/users?saved=password_reset_sent')
}

export async function removeUser(formData: FormData) {
  const currentUser = await ensureAdmin()
  const userId = String(formData.get('user_id') ?? '').trim()

  if (!userId) {
    redirect('/dashboard/users?error=invalid_user')
  }
  if (userId === currentUser.id) {
    redirect('/dashboard/users?error=cannot_remove_self')
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect('/dashboard/users?error=missing_service_role')
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) {
    redirect('/dashboard/users?error=remove_failed')
  }

  await logAdminAction({
    actorUserId: currentUser.id,
    action: 'user_removed',
    targetUserId: userId,
  })

  revalidatePath('/dashboard/users')
  redirect('/dashboard/users?saved=removed')
}
