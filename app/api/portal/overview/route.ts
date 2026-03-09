import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { getPortalOverview } from '@/utils/services/portal-overview'

export async function GET() {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const result = await getPortalOverview({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
