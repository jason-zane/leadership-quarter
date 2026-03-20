import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { listAdminAssessmentReportPreviewSubmissions } from '@/utils/services/admin-assessment-reports'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const url = new URL(request.url)
  const result = await listAdminAssessmentReportPreviewSubmissions({
    adminClient: auth.adminClient,
    assessmentId,
    mode: url.searchParams.get('mode') === 'sample' ? 'sample' : 'live',
    query: url.searchParams.get('q'),
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
