import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { createAdminCampaign, listAdminCampaigns } from '@/utils/services/admin-campaigns'

export async function GET() {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const result = await listAdminCampaigns({
    adminClient: auth.adminClient,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const result = await createAdminCampaign({
    adminClient: auth.adminClient,
    userId: auth.user.id,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'name_required' || result.error === 'invalid_slug'
        ? 400
        : result.error === 'slug_taken'
          ? 409
          : 500

    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.detail ? { detail: result.detail } : {}),
        ...(result.code ? { code: result.code } : {}),
        ...(result.message ? { message: result.message } : {}),
      },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
