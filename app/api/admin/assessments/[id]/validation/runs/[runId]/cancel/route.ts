import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function POST(
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

  const cancellableStatuses = ['queued', 'running']
  if (!cancellableStatuses.includes(run.status)) {
    return NextResponse.json({ ok: false, error: 'run_not_cancellable' }, { status: 400 })
  }

  const { error: updateError } = await auth.adminClient
    .from('psychometric_analysis_runs')
    .update({ status: 'cancelled' })
    .eq('id', runId)
    .eq('assessment_id', assessmentId)

  if (updateError) {
    return NextResponse.json({ ok: false, error: 'cancel_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
