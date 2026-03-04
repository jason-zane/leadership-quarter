import { cookies } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import {
  permissionsForPortalRole,
  type MembershipStatus,
  type PortalAuthContext,
  type PortalRole,
} from '@/utils/portal/types'

const PORTAL_ORG_COOKIE = 'lq_portal_org_id'

type MembershipRow = {
  id: string
  organisation_id: string
  role: PortalRole
  status: MembershipStatus
  organisations: { slug: string } | null
}

type ProfileRow = {
  role: 'admin' | 'staff'
}

export async function resolvePortalContext(): Promise<{
  userId: string
  email: string | null
  context: PortalAuthContext | null
  adminClient: NonNullable<ReturnType<typeof createAdminClient>> | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { userId: '', email: null, context: null, adminClient: null }
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return { userId: user.id, email: user.email ?? null, context: null, adminClient: null }
  }

  const [{ data: profileRow }, { data: membershipRow }] = await Promise.all([
    adminClient.from('profiles').select('role').eq('user_id', user.id).maybeSingle(),
    adminClient
      .from('organisation_memberships')
      .select('id, organisation_id, role, status, organisations(slug)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const membership = membershipRow as MembershipRow | null
  if (membership?.organisations?.slug) {
    return {
      userId: user.id,
      email: user.email ?? null,
      adminClient,
      context: {
        userId: user.id,
        email: user.email ?? null,
        organisationId: membership.organisation_id,
        organisationSlug: membership.organisations.slug,
        role: membership.role,
        membershipStatus: membership.status,
        source: 'membership',
        isBypassAdmin: false,
        permissions: permissionsForPortalRole(membership.role),
      },
    }
  }

  const internalRole = (profileRow as ProfileRow | null)?.role
  if (internalRole !== 'admin') {
    return { userId: user.id, email: user.email ?? null, context: null, adminClient }
  }

  const cookieStore = await cookies()
  const selectedOrgId = cookieStore.get(PORTAL_ORG_COOKIE)?.value ?? null

  const query = adminClient
    .from('organisations')
    .select('id, slug')
    .eq('status', 'active')
    .order('name', { ascending: true })
    .limit(1)

  let organisationRow: { id: string; slug: string } | null = null
  if (selectedOrgId) {
    const { data: selectedRow } = await adminClient
      .from('organisations')
      .select('id, slug')
      .eq('id', selectedOrgId)
      .eq('status', 'active')
      .maybeSingle()
    organisationRow = selectedRow
  }

  if (!organisationRow) {
    const { data: fallbackRow } = await query.maybeSingle()
    organisationRow = fallbackRow
  }

  if (!organisationRow) {
    return { userId: user.id, email: user.email ?? null, context: null, adminClient }
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    adminClient,
    context: {
      userId: user.id,
      email: user.email ?? null,
      organisationId: organisationRow.id,
      organisationSlug: organisationRow.slug,
      role: 'org_owner',
      membershipStatus: 'active',
      source: 'admin_bypass',
      isBypassAdmin: true,
      permissions: permissionsForPortalRole('org_owner'),
    },
  }
}

export { PORTAL_ORG_COOKIE }
