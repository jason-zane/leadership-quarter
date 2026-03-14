import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { listAdminCampaignResponses } from '@/utils/services/admin-campaigns'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params
  const { searchParams } = new URL(request.url)
  const result = await listAdminCampaignResponses({
    adminClient: auth.adminClient,
    campaignId,
    filters: {
      q: searchParams.get('q') ?? undefined,
      view: searchParams.get('view') === 'candidates' ? 'candidates' : 'submissions',
      assessmentId: searchParams.get('assessmentId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    },
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
