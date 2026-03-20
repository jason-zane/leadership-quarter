import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getAuthHandoffUrl, writeAuthHandoffCookie } from '@/utils/auth-handoff'
import { canUsePortalAdminBypass } from '@/utils/portal-admin-access'
import { isAllowedRequestOrigin } from '@/utils/security/request-origin'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'method_not_allowed', message: 'Use POST to launch the client portal.' },
    {
      status: 405,
      headers: {
        Allow: 'POST',
        'Cache-Control': 'no-store',
      },
    }
  )
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAllowedRequestOrigin(request.headers, { requireOrigin: true })) {
    return NextResponse.json(
      { ok: false, error: 'invalid_origin', message: 'Invalid request origin.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const [{ data: profileRow }, { data: organisation }] = await Promise.all([
    auth.adminClient
      .from('profiles')
      .select('role, portal_admin_access')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
    auth.adminClient
      .from('organisations')
      .select('id, slug, status')
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  if (!canUsePortalAdminBypass(profileRow as { role?: 'admin' | 'staff' | null; portal_admin_access?: boolean | null } | null)) {
    return NextResponse.json(
      { ok: false, error: 'forbidden', message: 'You do not have client portal launch access.' },
      { status: 403 }
    )
  }

  if (!organisation) {
    return NextResponse.json({ ok: false, error: 'not_found', message: 'Organisation not found.' }, { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token || !session.refresh_token) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized', message: 'Your admin session is unavailable.' },
      { status: 401 }
    )
  }

  const redirectPath = `/portal/admin/launch?organisation_id=${encodeURIComponent(organisation.id)}`
  const wroteCookie = await writeAuthHandoffCookie({
    surface: 'portal',
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    redirectPath,
  })

  if (!wroteCookie) {
    return NextResponse.json(
      { ok: false, error: 'handoff_unavailable', message: 'Portal session transfer is not configured.' },
      { status: 500 }
    )
  }

  await auth.adminClient.from('admin_audit_logs').insert({
    actor_user_id: auth.user.id,
    action: 'portal_admin_launch_requested',
    details: {
      organisation_id: organisation.id,
      organisation_slug: organisation.slug,
    },
  }).then(() => void 0, () => void 0)

  return NextResponse.redirect(getAuthHandoffUrl('portal'), 303)
}
