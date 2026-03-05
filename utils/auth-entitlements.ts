import { createAdminClient } from '@/utils/supabase/admin'
import { isAdminEmail } from '@/utils/admin-access'

type InternalRole = 'admin' | 'staff'
type PortalRole = 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'
type PortalMembershipStatus = 'invited' | 'active'

type ProfileRow = { role: InternalRole }
type MembershipRow = {
  id: string
  organisation_id: string
  role: PortalRole
  status: PortalMembershipStatus
}

export type UserEntitlements = {
  internalRole: InternalRole | null
  portalMembership: MembershipRow | null
  adminClientAvailable: boolean
  bootstrapInternalRole: boolean
}

export async function resolveUserEntitlements(
  userId: string,
  userEmail?: string | null
): Promise<UserEntitlements> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      internalRole: null,
      portalMembership: null,
      adminClientAvailable: false,
      bootstrapInternalRole: false,
    }
  }

  const [{ data: profileRow }, { data: membershipRow }] = await Promise.all([
    adminClient.from('profiles').select('role').eq('user_id', userId).maybeSingle(),
    adminClient
      .from('organisation_memberships')
      .select('id, organisation_id, role, status')
      .eq('user_id', userId)
      .in('status', ['invited', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const internalRole = (profileRow as ProfileRow | null)?.role ?? null
  const portalMembership = (membershipRow as MembershipRow | null) ?? null
  let bootstrapInternalRole = false
  let resolvedInternalRole: InternalRole | null = internalRole

  if (!resolvedInternalRole) {
    const allowBootstrap = process.env.ALLOW_ADMIN_EMAIL_BOOTSTRAP === 'true'
    if (allowBootstrap && isAdminEmail(userEmail)) {
      const { count, error } = await adminClient
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'admin')
      if (!error && (count ?? 0) === 0) {
        resolvedInternalRole = 'admin'
        bootstrapInternalRole = true
      }
    }
  }

  return {
    internalRole: resolvedInternalRole,
    portalMembership,
    adminClientAvailable: true,
    bootstrapInternalRole,
  }
}

export async function activatePortalMembershipIfInvited(membershipId: string, userId: string) {
  const adminClient = createAdminClient()
  if (!adminClient) return

  await adminClient
    .from('organisation_memberships')
    .update({
      status: 'active',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', membershipId)
    .eq('user_id', userId)
    .eq('status', 'invited')
}
