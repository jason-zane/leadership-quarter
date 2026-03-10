import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  createPsychometricAnalysisRun,
  listPsychometricAnalysisRuns,
} from '@/utils/services/psychometric-analysis-runs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await listPsychometricAnalysisRuns({
    adminClient: auth.adminClient,
    assessmentId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await createPsychometricAnalysisRun({
    adminClient: auth.adminClient,
    assessmentId,
    requestedBy: auth.user.id,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'no_scales_configured' ? 422 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
