import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  addAdminCampaignAssessment,
  removeAdminCampaignAssessment,
} from '@/utils/services/admin-campaigns'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params
  const result = await addAdminCampaignAssessment({
    adminClient: auth.adminClient,
    campaignId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'survey_id_required'
        ? 400
        : result.error === 'assessment_already_added'
          ? 409
          : 500

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params

  const url = new URL(request.url)
  const assessmentId = url.searchParams.get('assessmentId')
  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: 'assessmentId_required' }, { status: 400 })
  }

  const result = await removeAdminCampaignAssessment({
    adminClient: auth.adminClient,
    campaignId,
    campaignAssessmentId: assessmentId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
