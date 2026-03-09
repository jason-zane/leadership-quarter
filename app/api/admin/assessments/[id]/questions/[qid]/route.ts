import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  deleteAdminAssessmentQuestion,
  type AdminAssessmentQuestionInput,
  updateAdminAssessmentQuestion,
} from '@/utils/services/admin-assessment-questions'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id, qid } = await params
  const result = await updateAdminAssessmentQuestion({
    adminClient: auth.adminClient,
    assessmentId: id,
    questionId: qid,
    payload: (await request.json().catch(() => null)) as AdminAssessmentQuestionInput | null,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, ...(result.message ? { message: result.message } : {}) },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id, qid } = await params
  const result = await deleteAdminAssessmentQuestion({
    adminClient: auth.adminClient,
    assessmentId: id,
    questionId: qid,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, ...(result.message ? { message: result.message } : {}) },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
