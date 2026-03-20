import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  getAdminAssessmentPsychometricsWorkspace,
  saveAdminAssessmentPsychometricsConfig,
} from '@/utils/services/admin-assessment-psychometrics'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await getAdminAssessmentPsychometricsWorkspace({
    adminClient: auth.adminClient,
    assessmentId: id,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const payload = await request.json().catch(() => null) as { psychometricsConfig?: unknown } | null
  const result = await saveAdminAssessmentPsychometricsConfig({
    adminClient: auth.adminClient,
    assessmentId: id,
    psychometricsConfig: payload?.psychometricsConfig ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, message: result.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, psychometricsConfig: result.data })
}
