import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  createAdminOrganisation,
  listAdminOrganisations,
  parseOrganisationPagination,
} from '@/utils/services/admin-organisations'

export async function GET(request: Request) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const { page, pageSize } = parseOrganisationPagination(searchParams)
  const { data: profileRow } = await auth.adminClient
    .from('profiles')
    .select('role, portal_admin_access')
    .eq('user_id', auth.user.id)
    .maybeSingle()
  const result = await listAdminOrganisations({
    adminClient: auth.adminClient,
    viewerProfile: (profileRow ?? {}) as { role?: 'admin' | 'staff' | null; portal_admin_access?: boolean | null },
    page,
    pageSize,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const result = await createAdminOrganisation({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'name_required' || result.error === 'invalid_slug'
        ? 400
        : result.error === 'slug_taken'
          ? 409
          : result.error.startsWith('default_owner_')
            ? 500
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
