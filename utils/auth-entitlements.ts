import { createAdminClient } from '@/utils/supabase/admin'

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
}

export async function resolveUserEntitlements(userId: string): Promise<UserEntitlements> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      internalRole: null,
      portalMembership: null,
      adminClientAvailable: false,
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

  return {
    internalRole,
    portalMembership,
    adminClientAvailable: true,
  }
}

export async function activatePortalMembershipIfInvited(membershipId: string) {
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
    .eq('status', 'invited')
}
