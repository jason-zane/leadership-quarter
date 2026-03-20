import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { uploadAdminAssessmentReportAsset } from '@/utils/services/admin-assessment-reports'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, reportId } = await params

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 })
  }

  const allowedTypes = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ ok: false, error: 'invalid_file_type' }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: 'file_too_large' }, { status: 400 })
  }

  const result = await uploadAdminAssessmentReportAsset({
    adminClient: auth.adminClient,
    assessmentId,
    reportId,
    file,
  })

  if (!result.ok) {
    const status = result.error === 'report_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, url: result.url })
}
