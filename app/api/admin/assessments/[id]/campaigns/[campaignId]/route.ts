import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  deleteAdminCampaign,
  removeAdminCampaignAssessment,
  updateAdminCampaign,
} from '@/utils/services/admin-campaigns'

type DeletePayload = {
  mode?: 'detach' | 'campaign'
  campaignAssessmentId?: string
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; campaignId: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { campaignId } = await params
  const result = await updateAdminCampaign({
    adminClient: auth.adminClient,
    campaignId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' || result.error === 'invalid_slug'
        ? 400
        : result.error === 'slug_taken'
          ? 409
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; campaignId: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { campaignId } = await params
  const payload = await request.json().catch(() => null) as DeletePayload | null

  if (payload?.mode === 'detach') {
    const campaignAssessmentId = String(payload.campaignAssessmentId ?? '').trim()
    if (!campaignAssessmentId) {
      return NextResponse.json({ ok: false, error: 'campaign_assessment_id_required' }, { status: 400 })
    }

    const result = await removeAdminCampaignAssessment({
      adminClient: auth.adminClient,
      campaignId,
      campaignAssessmentId,
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  const result = await deleteAdminCampaign({
    adminClient: auth.adminClient,
    campaignId,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.error === 'campaign_has_activity' ? 409 : 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
