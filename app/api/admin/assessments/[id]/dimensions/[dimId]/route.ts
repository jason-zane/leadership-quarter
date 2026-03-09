import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  updateAdminAssessmentDimension,
  deleteAdminAssessmentDimension,
} from '@/utils/services/admin-assessment-dimensions'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dimId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, dimId: dimensionId } = await params
  const result = await updateAdminAssessmentDimension({
    adminClient: auth.adminClient,
    assessmentId,
    dimensionId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'no_updates' ? 400 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dimId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, dimId: dimensionId } = await params
  const result = await deleteAdminAssessmentDimension({
    adminClient: auth.adminClient,
    assessmentId,
    dimensionId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
