import { NextResponse } from 'next/server'
import { verifyGateAccessToken } from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const { token } = await params
  const payload = verifyGateAccessToken(token)
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'gate_expired' }, { status: 410 })
  }

  const { data: submission, error } = await adminClient
    .from('assessment_submissions')
    .select('id, campaign_id, assessment_id, campaigns(name), assessments(name)')
    .eq('id', payload.submissionId)
    .maybeSingle()

  if (error || !submission) {
    return NextResponse.json({ ok: false, error: 'submission_not_found' }, { status: 404 })
  }

  if (submission.campaign_id !== payload.campaignId || submission.assessment_id !== payload.assessmentId) {
    return NextResponse.json({ ok: false, error: 'gate_invalid' }, { status: 410 })
  }

  const campaignRel = submission.campaigns as unknown
  const campaign = (Array.isArray(campaignRel) ? campaignRel[0] : campaignRel) as { name?: string } | null
  const assessmentRel = submission.assessments as unknown
  const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as { name?: string } | null

  return NextResponse.json({
    ok: true,
    context: {
      campaignName: campaign?.name ?? null,
      assessmentName: assessment?.name ?? 'Assessment',
    },
  })
}
