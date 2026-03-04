import { NextResponse } from 'next/server'
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
  response.cookies.set(PORTAL_ORG_COOKIE, organisationId, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
  })
  return response
}
