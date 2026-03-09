import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  updateAdminInterpretationRule,
  deleteAdminInterpretationRule,
} from '@/utils/services/admin-interpretation-rules'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, ruleId } = await params
  const result = await updateAdminInterpretationRule({
    adminClient: auth.adminClient,
    assessmentId,
    ruleId,
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
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, ruleId } = await params
  const result = await deleteAdminInterpretationRule({
    adminClient: auth.adminClient,
    assessmentId,
    ruleId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
