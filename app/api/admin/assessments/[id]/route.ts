import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  deleteAdminAssessment,
  getAdminAssessment,
  updateAdminAssessment,
} from '@/utils/services/admin-assessments'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await getAdminAssessment({
    adminClient: auth.adminClient,
    assessmentId: id,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    assessment: result.data.assessment,
    // Backward compatibility alias.
    survey: result.data.assessment,
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await updateAdminAssessment({
    adminClient: auth.adminClient,
    assessmentId: id,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'assessment_not_publishable' ? 400 : 500
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.issues ? { issues: result.issues } : {}),
        ...(result.coverage ? { coverage: result.coverage } : {}),
      },
      { status }
    )
  }

  return NextResponse.json({
    ok: true,
    assessment: result.data.assessment,
    // Backward compatibility alias.
    survey: result.data.assessment,
  })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await deleteAdminAssessment({
    adminClient: auth.adminClient,
    assessmentId: id,
  })

  if (!result.ok) {
    const status = result.error === 'survey_has_submissions' ? 409 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true })
}
