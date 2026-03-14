import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { duplicateAdminAssessment } from '@/utils/services/admin-assessments'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await duplicateAdminAssessment({
    adminClient: auth.adminClient,
    assessmentId: id,
    userId: auth.user.id,
  })

  if (!result.ok) {
    const status = result.error === 'assessment_not_found' ? 404 : 500
    return NextResponse.json(
      { ok: false, error: result.error, ...(result.message ? { message: result.message } : {}) },
      { status }
    )
  }

  return NextResponse.json({ ok: true, assessment: result.data.assessment }, { status: 201 })
}
