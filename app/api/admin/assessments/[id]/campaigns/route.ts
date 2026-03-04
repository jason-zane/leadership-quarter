import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

// GET — list campaigns that include this assessment (via junction table)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params

  // Find campaign IDs that include this assessment
  const { data: junctionRows, error: junctionError } = await auth.adminClient
    .from('campaign_assessments')
    .select('campaign_id')
    .eq('assessment_id', assessmentId)

  if (junctionError) {
    return NextResponse.json({ ok: false, error: 'campaigns_list_failed' }, { status: 500 })
  }

  const campaignIds = (junctionRows ?? []).map((r) => r.campaign_id)

  if (campaignIds.length === 0) {
    return NextResponse.json({ ok: true, campaigns: [] })
  }

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .select('id, organisation_id, name, slug, status, config, created_at, organisations(id, name, slug)')
    .in('id', campaignIds)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'campaigns_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, campaigns: data ?? [] })
}
