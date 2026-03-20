import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  createAdminAssessmentReport,
  listAdminAssessmentReports,
} from '@/utils/services/admin-assessment-reports'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await listAdminAssessmentReports({
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
  const body = await request.json().catch(() => null)

  const result = await createAdminAssessmentReport({
    adminClient: auth.adminClient,
    assessmentId,
    payload: body,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
