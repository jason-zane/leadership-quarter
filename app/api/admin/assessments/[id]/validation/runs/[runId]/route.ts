import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getPsychometricAnalysisRunDetail } from '@/utils/services/psychometric-analysis-runs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, runId } = await params
  const result = await getPsychometricAnalysisRunDetail({
    adminClient: auth.adminClient,
    assessmentId,
    runId,
  })

  if (!result.ok) {
    const status = result.error === 'analysis_run_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, runId } = await params

  const { data: run, error: fetchError } = await auth.adminClient
    .from('psychometric_analysis_runs')
    .select('id, status')
    .eq('id', runId)
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (fetchError || !run) {
    return NextResponse.json({ ok: false, error: 'run_not_found' }, { status: 404 })
  }

  const deletableStatuses = ['queued', 'failed', 'superseded', 'cancelled']
  if (!deletableStatuses.includes(run.status)) {
    return NextResponse.json({ ok: false, error: 'run_not_deletable' }, { status: 400 })
  }

  const { error: deleteError } = await auth.adminClient
    .from('psychometric_analysis_runs')
    .delete()
    .eq('id', runId)
    .eq('assessment_id', assessmentId)

  if (deleteError) {
    return NextResponse.json({ ok: false, error: 'delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
