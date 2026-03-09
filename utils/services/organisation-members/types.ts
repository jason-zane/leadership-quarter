export type PortalRole = 'org_owner' | 'org_admin' | 'campaign_manager' | 'viewer'
export type InviteMode = 'auto' | 'email' | 'manual_link'
export type DeliveryMode = 'email' | 'manual_link' | 'auto_fallback'
export type MembershipStatus = 'invited' | 'active' | 'suspended'

export type MembershipRow = {
  id: string
  organisation_id: string
  user_id: string
  role: PortalRole
  status: string
  invited_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

export const allowedRoles = new Set<PortalRole>([
  'org_owner',
  'org_admin',
  'campaign_manager',
  'viewer',
])

export const allowedInviteModes = new Set<InviteMode>([
  'auto',
  'email',
  'manual_link',
])

export const allowedStatuses = new Set<MembershipStatus>([
  'invited',
  'active',
  'suspended',
])
