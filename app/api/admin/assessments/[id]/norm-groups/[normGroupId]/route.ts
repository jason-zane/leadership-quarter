import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { updateAdminNormGroup, deleteAdminNormGroup } from '@/utils/services/admin-norm-groups'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; normGroupId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, normGroupId } = await params
  const result = await updateAdminNormGroup({
    adminClient: auth.adminClient,
    assessmentId,
    normGroupId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; normGroupId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, normGroupId } = await params
  const result = await deleteAdminNormGroup({
    adminClient: auth.adminClient,
    assessmentId,
    normGroupId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
