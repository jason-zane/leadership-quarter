import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  listAdminInterpretationRules,
  createAdminInterpretationRule,
} from '@/utils/services/admin-interpretation-rules'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await listAdminInterpretationRules({ adminClient: auth.adminClient, assessmentId })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await createAdminInterpretationRule({
    adminClient: auth.adminClient,
    assessmentId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'invalid_fields' || result.error === 'invalid_percentile_range' ? 400 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
