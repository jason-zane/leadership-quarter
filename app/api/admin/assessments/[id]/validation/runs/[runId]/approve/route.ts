import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { approvePsychometricAnalysisRun } from '@/utils/services/psychometric-analysis-runs'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, runId } = await params
  const result = await approvePsychometricAnalysisRun({
    adminClient: auth.adminClient,
    assessmentId,
    runId,
    approvedBy: auth.user.id,
  })

  if (!result.ok) {
    const status =
      result.error === 'analysis_run_not_found'
        ? 404
        : result.error === 'analysis_run_not_ready'
          ? 409
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true })
}
