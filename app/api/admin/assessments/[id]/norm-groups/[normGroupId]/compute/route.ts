import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { computeNormsFromSubmissions, reScoreSessionsForNormGroup } from '@/utils/services/norm-computation'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; normGroupId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, normGroupId } = await params

  const computeResult = await computeNormsFromSubmissions({
    adminClient: auth.adminClient,
    assessmentId,
    normGroupId,
  })

  if (!computeResult.ok) {
    const status = computeResult.error === 'norm_group_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: computeResult.error }, { status })
  }

  const reScoreResult = await reScoreSessionsForNormGroup({
    adminClient: auth.adminClient,
    normGroupId,
  })

  return NextResponse.json({
    ok: true,
    traitsComputed: computeResult.data.traitsComputed,
    n: computeResult.data.n,
    sessionsUpdated: reScoreResult.ok ? reScoreResult.data.sessionsUpdated : 0,
  })
}
