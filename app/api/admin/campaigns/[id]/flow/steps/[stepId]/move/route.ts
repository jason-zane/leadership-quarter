import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { moveAdminCampaignFlowStep } from '@/utils/services/admin-campaigns'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId, stepId } = await params
  const body = await request.json().catch(() => null) as { direction?: 'up' | 'down' } | null
  if (body?.direction !== 'up' && body?.direction !== 'down') {
    return NextResponse.json({ ok: false, error: 'invalid_direction' }, { status: 400 })
  }

  const result = await moveAdminCampaignFlowStep({
    adminClient: auth.adminClient,
    campaignId,
    stepId,
    direction: body.direction,
  })

  if (!result.ok) {
    const status = result.error === 'flow_step_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true })
}
