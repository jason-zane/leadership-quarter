export type InternalAdminProfile = {
  role?: 'admin' | 'staff' | null
  portal_admin_access?: boolean | null
}

export function canUsePortalAdminBypass(profile: InternalAdminProfile | null | undefined) {
  return profile?.role === 'admin' && profile?.portal_admin_access === true
}

export function getPortalDefaultOwnerEmail() {
  return process.env.PORTAL_DEFAULT_OWNER_EMAIL?.trim().toLowerCase() || null
}
