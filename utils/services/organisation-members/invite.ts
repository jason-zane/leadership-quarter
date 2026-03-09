import type { SupabaseClient } from '@supabase/supabase-js'
import { getPasswordRedirectUrl } from '@/utils/auth-urls'
import {
  ensureAuthUser,
  findAuthUserByEmail,
  generateSetupLink,
  isValidEmail,
  logAdminAction,
  shouldFallbackToManualLink,
} from '@/utils/services/organisation-members/shared'
import {
  allowedInviteModes,
  allowedRoles,
  type DeliveryMode,
  type InviteMode,
  type MembershipRow,
  type PortalRole,
} from '@/utils/services/organisation-members/types'

export function parseOrganisationMemberInvitePayload(
  payload: {
    email?: string
    role?: PortalRole
    mode?: InviteMode
  } | null
):
  | { ok: true; data: { email: string; role: PortalRole; mode: InviteMode } }
  | { ok: false; error: 'invalid_payload' } {
  const email = String(payload?.email ?? '')
    .trim()
    .toLowerCase()
  const role = String(payload?.role ?? '') as PortalRole
  const mode = (String(payload?.mode ?? 'auto').trim() || 'auto') as InviteMode

  if (!isValidEmail(email) || !allowedRoles.has(role) || !allowedInviteModes.has(mode)) {
    return { ok: false, error: 'invalid_payload' }
  }

  return {
    ok: true,
    data: { email, role, mode },
  }
}

function mapInviteFailure(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('redirect')) {
    return 'invite_redirect_not_allowed' as const
  }

  if (normalized.includes('smtp') || normalized.includes('email')) {
    return 'invite_email_provider_failed' as const
  }

  if (
    normalized.includes('already') ||
    normalized.includes('registered') ||
    normalized.includes('exists')
  ) {
    return 'invite_user_already_exists' as const
  }

  return 'invite_failed' as const
}

async function inviteByEmail(
  adminClient: SupabaseClient,
  email: string
) {
  let redirectTo: string

  try {
    redirectTo = getPasswordRedirectUrl('set', 'portal')
  } catch {
    return {
      ok: false as const,
      error: 'site_url_not_configured' as const,
    }
  }

  let { data: invited, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
    })

  if (inviteError?.message.toLowerCase().includes('redirect')) {
    const adminRedirect = getPasswordRedirectUrl('set', 'admin')
    const retry = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: adminRedirect,
    })
    invited = retry.data
    inviteError = retry.error
  }

  if (inviteError || !invited.user?.id) {
    return {
      ok: false as const,
      error: mapInviteFailure(inviteError?.message ?? 'Invite failed.'),
      message: inviteError?.message,
    }
  }

  return {
    ok: true as const,
    user: {
      id: invited.user.id,
      email: invited.user.email ?? null,
    },
  }
}

export async function inviteOrganisationMember(input: {
  adminClient: SupabaseClient
  actorUserId: string
  organisationId: string
  payload: {
    email?: string
    role?: PortalRole
    mode?: InviteMode
  } | null
}): Promise<
  | {
      ok: true
      data: {
        member: MembershipRow & { email: string }
        delivery: DeliveryMode
        setup_link?: string
        warning?: string
      }
    }
  | {
      ok: false
      error:
        | 'invalid_payload'
        | 'site_url_not_configured'
        | 'invite_redirect_not_allowed'
        | 'invite_email_provider_failed'
        | 'invite_user_already_exists'
        | 'invite_failed'
        | 'user_create_failed'
        | 'setup_link_generation_failed'
        | 'user_lookup_failed'
        | 'membership_upsert_failed'
      message?: string
    }
> {
  const parsed = parseOrganisationMemberInvitePayload(input.payload)
  if (!parsed.ok) {
    return parsed
  }

  const { email, role, mode } = parsed.data
  let user = await findAuthUserByEmail(input.adminClient, email)
  let delivery: DeliveryMode = 'email'
  let setupLink: string | null = null
  let warning: string | null = null

  const shouldAttemptEmail = mode === 'auto' || mode === 'email'

  if (!user && shouldAttemptEmail) {
    const invited = await inviteByEmail(input.adminClient, email)

    if (invited.ok) {
      user = invited.user
    } else if (mode === 'email' || !shouldFallbackToManualLink(invited.message ?? '')) {
      return {
        ok: false,
        error: invited.error,
        ...(invited.message ? { message: invited.message } : {}),
      }
    } else {
      delivery = 'auto_fallback'
      warning = `Email invite failed (${invited.message}). Generated manual setup link instead.`
    }
  }

  const useManualLink = mode === 'manual_link' || delivery === 'auto_fallback' || !user

  if (useManualLink) {
    const ensured = await ensureAuthUser(input.adminClient, email)
    if (ensured.error || !ensured.user) {
      return {
        ok: false,
        error: 'user_create_failed',
        message: ensured.error ?? 'Failed to create auth user.',
      }
    }
    user = ensured.user

    const linkResult = await generateSetupLink(input.adminClient, email)
    if (linkResult.error || !linkResult.setupLink) {
      return {
        ok: false,
        error: linkResult.error ?? 'setup_link_generation_failed',
        message: linkResult.message ?? undefined,
      }
    }
    setupLink = linkResult.setupLink
    if (mode === 'manual_link') {
      delivery = 'manual_link'
    }
  }

  if (!user?.id) {
    return {
      ok: false,
      error: 'user_lookup_failed',
      message: 'Auth user is missing.',
    }
  }

  const now = new Date().toISOString()
  const { data, error } = await input.adminClient
    .from('organisation_memberships')
    .upsert(
      {
        organisation_id: input.organisationId,
        user_id: user.id,
        role,
        status: 'invited',
        invited_by: input.actorUserId,
        invited_at: now,
        updated_at: now,
      },
      { onConflict: 'organisation_id,user_id' }
    )
    .select(
      'id, organisation_id, user_id, role, status, invited_at, accepted_at, created_at, updated_at'
    )
    .single()

  if (error || !data) {
    return {
      ok: false,
      error: 'membership_upsert_failed',
      message: error?.message,
    }
  }

  await logAdminAction({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'organisation_member_invited',
    targetUserId: data.user_id,
    targetEmail: email,
    details: {
      organisation_id: input.organisationId,
      role,
      status: 'invited',
      delivery,
      fallback: delivery === 'auto_fallback',
      has_setup_link: Boolean(setupLink),
    },
  })

  return {
    ok: true,
    data: {
      member: { ...(data as MembershipRow), email },
      delivery,
      ...(setupLink ? { setup_link: setupLink } : {}),
      ...(warning ? { warning } : {}),
    },
  }
}
