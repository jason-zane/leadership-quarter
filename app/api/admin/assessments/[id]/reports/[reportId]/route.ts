import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  getAdminAssessmentReport,
  updateAdminAssessmentReport,
} from '@/utils/services/admin-assessment-reports'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, reportId } = await params
  const result = await getAdminAssessmentReport({
    adminClient: auth.adminClient,
    assessmentId,
    reportId,
  })

  if (!result.ok) {
    const status = result.error === 'report_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, reportId } = await params
  const body = await request.json().catch(() => null)

  const result = await updateAdminAssessmentReport({
    adminClient: auth.adminClient,
    assessmentId,
    reportId,
    payload: body,
  })

  if (!result.ok) {
    const status = result.error === 'report_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
