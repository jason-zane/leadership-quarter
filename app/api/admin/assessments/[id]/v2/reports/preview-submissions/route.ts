import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { listAdminAssessmentV2ReportPreviewSubmissions } from '@/utils/services/admin-assessment-v2-reports'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const url = new URL(request.url)
  const result = await listAdminAssessmentV2ReportPreviewSubmissions({
    adminClient: auth.adminClient,
    assessmentId,
    query: url.searchParams.get('q'),
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
