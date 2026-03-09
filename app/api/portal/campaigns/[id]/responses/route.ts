import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { listPortalCampaignResponses } from '@/utils/services/portal-campaign-workspace'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params
  const result = await listPortalCampaignResponses({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    campaignId,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: result.error === 'not_found' ? 404 : 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
