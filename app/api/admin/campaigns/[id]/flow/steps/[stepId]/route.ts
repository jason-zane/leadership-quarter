import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  deleteAdminCampaignFlowStep,
  updateAdminCampaignFlowStep,
} from '@/utils/services/admin-campaigns'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId, stepId } = await params
  const result = await updateAdminCampaignFlowStep({
    adminClient: auth.adminClient,
    campaignId,
    stepId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'flow_step_not_found' || result.error === 'invalid_payload'
        ? 404
        : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId, stepId } = await params
  const result = await deleteAdminCampaignFlowStep({
    adminClient: auth.adminClient,
    campaignId,
    stepId,
  })

  if (!result.ok) {
    const status = result.error === 'flow_step_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true })
}
