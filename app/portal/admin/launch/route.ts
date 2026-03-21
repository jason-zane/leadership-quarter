import { NextResponse } from 'next/server'
import { getClientLoginUrl } from '@/utils/auth-urls'
import { canUsePortalAdminBypass } from '@/utils/portal-admin-access'
import { PORTAL_ORG_COOKIE } from '@/utils/portal-context'
import { writePortalAdminBypassCookies } from '@/utils/portal-bypass-session'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL(getClientLoginUrl({ error: 'unauthorized' })))
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.redirect(new URL('/portal?error=missing_service_role', request.url))
  }

  const url = new URL(request.url)
  const organisationId = url.searchParams.get('organisation_id')?.trim() ?? ''
  if (!organisationId) {
    return NextResponse.redirect(new URL('/portal?error=missing_organisation', request.url))
  }

  const [{ data: profileRow }, { data: organisation }] = await Promise.all([
    adminClient
      .from('profiles')
      .select('role, portal_admin_access')
      .eq('user_id', user.id)
      .maybeSingle(),
    adminClient
      .from('organisations')
      .select('id, slug')
      .eq('id', organisationId)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  if (!canUsePortalAdminBypass(profileRow as { role?: 'admin' | 'staff' | null; portal_admin_access?: boolean | null } | null)) {
    return NextResponse.redirect(new URL('/portal?error=forbidden', request.url))
  }

  if (!organisation) {
    return NextResponse.redirect(new URL('/portal?error=organisation_not_found', request.url))
  }

  await adminClient.from('admin_audit_logs').insert({
    actor_user_id: user.id,
    action: 'portal_admin_launch',
    details: {
      organisation_id: organisation.id,
      organisation_slug: organisation.slug,
    },
  }).then(() => void 0, () => void 0)

  const response = NextResponse.redirect(new URL('/portal', request.url))
  const wroteCookies = writePortalAdminBypassCookies(response, {
    userId: user.id,
    organisationId: organisation.id,
    organisationCookieName: PORTAL_ORG_COOKIE,
  })

  if (!wroteCookies) {
    return NextResponse.redirect(new URL('/portal?error=handoff_unavailable', request.url))
  }

  return response
}
