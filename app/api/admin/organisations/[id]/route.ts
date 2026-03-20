import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { canUsePortalAdminBypass } from '@/utils/portal-admin-access'
import { deleteAdminOrganisation } from '@/utils/services/admin-organisations'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data: profileRow } = await auth.adminClient
    .from('profiles')
    .select('role, portal_admin_access')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  const { data, error } = await auth.adminClient
    .from('organisations')
    .select('id, name, slug, website, status, branding_config, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  const canBypassPortal = canUsePortalAdminBypass(
    profileRow as { role?: 'admin' | 'staff' | null; portal_admin_access?: boolean | null } | null
  )
  const canLaunchPortal = canBypassPortal && data.status === 'active'
  const portalLaunchReason =
    data.status !== 'active'
      ? 'organisation_unavailable'
      : canBypassPortal
        ? 'available'
        : 'viewer_lacks_access'

  return NextResponse.json({
    ok: true,
    organisation: data,
    viewer: {
      userId: auth.user.id,
      canLaunchPortal,
      portalLaunchReason,
    },
  })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await deleteAdminOrganisation({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    organisationId: id,
  })

  if (!result.ok) {
    const status = result.error === 'organisation_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true })
}
