import { NextResponse } from 'next/server'
import { writePortalAdminBypassCookies } from '@/utils/portal-bypass-session'
import { PORTAL_ORG_COOKIE } from '@/utils/portal-context'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

export async function POST(request: Request) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  if (!auth.context.isBypassAdmin) {
    return NextResponse.json(
      { ok: false, error: 'forbidden', message: 'Only internal admins can switch organisation context.' },
      { status: 403 }
    )
  }

  const body = (await request.json().catch(() => null)) as { organisation_id?: string } | null
  const organisationId = String(body?.organisation_id ?? '').trim()
  if (!organisationId) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'organisation_id is required.' },
      { status: 400 }
    )
  }

  const { data: organisation } = await auth.adminClient
    .from('organisations')
    .select('id')
    .eq('id', organisationId)
    .eq('status', 'active')
    .maybeSingle()

  if (!organisation) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Organisation was not found.' },
      { status: 404 }
    )
  }

  const response = NextResponse.json({ ok: true })
  const wroteCookies = writePortalAdminBypassCookies(response, {
    userId: auth.user.id,
    organisationId,
    organisationCookieName: PORTAL_ORG_COOKIE,
  })
  if (!wroteCookies) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Portal launch credentials are not configured.' },
      { status: 500 }
    )
  }

  const { error: auditError } = await auth.adminClient.from('admin_audit_logs').insert({
    actor_user_id: auth.user.id,
    action: 'portal_admin_context_switched',
    details: {
      organisation_id: organisationId,
    },
  })

  if (auditError) {
    console.error('admin_audit_logs insert failed:', auditError.message)
  }

  return response
}
