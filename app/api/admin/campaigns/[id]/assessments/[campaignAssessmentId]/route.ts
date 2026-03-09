import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { updateAdminCampaignAssessment } from '@/utils/services/admin-campaigns'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; campaignAssessmentId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId, campaignAssessmentId } = await params
  const result = await updateAdminCampaignAssessment({
    adminClient: auth.adminClient,
    campaignId,
    campaignAssessmentId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'invalid_payload' ? 400 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
