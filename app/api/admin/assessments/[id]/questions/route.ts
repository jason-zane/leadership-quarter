import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { createAdminAssessmentQuestions, listAdminAssessmentQuestions } from '@/utils/services/admin-assessment-questions'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await listAdminAssessmentQuestions({
    adminClient: auth.adminClient,
    assessmentId: id,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await createAdminAssessmentQuestions({
    adminClient: auth.adminClient,
    assessmentId: id,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'invalid_fields' ? 400 : 500
    return NextResponse.json(
      { ok: false, error: result.error, ...(result.message ? { message: result.message } : {}) },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
