import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import {
  getPortalCampaignDetail,
  updatePortalCampaign,
  type UpdatePortalCampaignPayload,
} from '@/utils/services/portal-campaign-detail'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await getPortalCampaignDetail({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    campaignId: id,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth({
    allowedRoles: ['org_owner', 'org_admin', 'campaign_manager'],
  })
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await updatePortalCampaign({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    campaignId: id,
    payload: (await request.json().catch(() => null)) as UpdatePortalCampaignPayload | null,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: result.error === 'not_found' ? 404 : result.error === 'internal_error' ? 500 : 400 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
