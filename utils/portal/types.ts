export type PortalRole = 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'

export type MembershipStatus = 'invited' | 'active' | 'suspended'

export type PortalPermission =
  | 'campaign.read'
  | 'campaign.write'
  | 'invite.read'
  | 'invite.write'
  | 'response.read'
  | 'analytics.read'
  | 'export.read'
  | 'user.read'
  | 'user.write'

export type PortalAuthContext = {
  userId: string
  email: string | null
  organisationId: string
  organisationSlug: string
  role: PortalRole
  membershipStatus: MembershipStatus
  source: 'membership' | 'admin_bypass'
  isBypassAdmin: boolean
  permissions: PortalPermission[]
}

const rolePermissions: Record<PortalRole, PortalPermission[]> = {
  org_owner: [
    'campaign.read',
    'campaign.write',
    'invite.read',
    'invite.write',
    'response.read',
    'analytics.read',
    'export.read',
    'user.read',
    'user.write',
  ],
  org_admin: [
    'campaign.read',
    'campaign.write',
    'invite.read',
    'invite.write',
    'response.read',
    'analytics.read',
    'export.read',
    'user.read',
    'user.write',
  ],
  campaign_manager: [
    'campaign.read',
    'campaign.write',
    'invite.read',
    'invite.write',
    'response.read',
    'analytics.read',
    'export.read',
  ],
  viewer: ['campaign.read', 'invite.read', 'response.read', 'analytics.read', 'export.read'],
}

export function permissionsForPortalRole(role: PortalRole): PortalPermission[] {
  return rolePermissions[role]
}
