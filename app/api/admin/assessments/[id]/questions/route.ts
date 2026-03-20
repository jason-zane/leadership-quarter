import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  getAdminAssessmentQuestionBank,
  saveAdminAssessmentQuestionBank,
} from '@/utils/services/admin-assessment-question-bank'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await getAdminAssessmentQuestionBank({
    adminClient: auth.adminClient,
    assessmentId: id,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const payload = await request.json().catch(() => null) as { questionBank?: unknown } | null
  const result = await saveAdminAssessmentQuestionBank({
    adminClient: auth.adminClient,
    assessmentId: id,
    questionBank: payload?.questionBank ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, message: result.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
