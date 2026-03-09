import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  updateAdminAssessmentTrait,
  deleteAdminAssessmentTrait,
} from '@/utils/services/admin-assessment-traits'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; traitId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, traitId } = await params
  const result = await updateAdminAssessmentTrait({
    adminClient: auth.adminClient,
    assessmentId,
    traitId,
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
  { params }: { params: Promise<{ id: string; traitId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, traitId } = await params
  const result = await deleteAdminAssessmentTrait({
    adminClient: auth.adminClient,
    assessmentId,
    traitId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
