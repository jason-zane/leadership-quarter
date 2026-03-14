import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { addAdminCampaignFlowStep } from '@/utils/services/admin-campaigns'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params
  const result = await addAdminCampaignFlowStep({
    adminClient: auth.adminClient,
    campaignId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'survey_id_required' || result.error === 'flow_steps_not_ready'
        ? 400
        : result.error === 'assessment_already_added'
          ? 409
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
