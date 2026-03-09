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
  const result = await listAdminOrganisations({
    adminClient: auth.adminClient,
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
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'name_required' || result.error === 'invalid_slug'
        ? 400
        : result.error === 'slug_taken'
          ? 409
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
