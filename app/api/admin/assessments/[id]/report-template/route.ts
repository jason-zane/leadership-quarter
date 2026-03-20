import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  getAdminAssessmentReportTemplate,
  saveAdminAssessmentReportTemplate,
} from '@/utils/services/admin-assessment-report-template'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await getAdminAssessmentReportTemplate({
    adminClient: auth.adminClient,
    assessmentId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object' || !body.template) {
    return NextResponse.json({ ok: false, error: 'missing_template' }, { status: 400 })
  }

  const result = await saveAdminAssessmentReportTemplate({
    adminClient: auth.adminClient,
    assessmentId,
    template: body.template,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
