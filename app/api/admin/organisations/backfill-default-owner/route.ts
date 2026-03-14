import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { backfillDefaultPortalOwnerMemberships } from '@/utils/services/portal-default-owner'

export async function POST() {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const result = await backfillDefaultPortalOwnerMemberships({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message ?? 'Backfill failed.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
