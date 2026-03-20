import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getAdminAssessmentReportPreview } from '@/utils/services/admin-assessment-reports'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, reportId } = await params
  const url = new URL(request.url)
  const submissionId = url.searchParams.get('submissionId')?.trim() || ''

  if (!submissionId) {
    return NextResponse.json({ ok: false, error: 'submission_not_found' }, { status: 400 })
  }

  const result = await getAdminAssessmentReportPreview({
    adminClient: auth.adminClient,
    assessmentId,
    reportId,
    submissionId,
  })

  if (!result.ok) {
    const status = result.error === 'submission_not_found' || result.error === 'report_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
