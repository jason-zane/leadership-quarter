import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { createAdminAssessment, listAdminAssessments } from '@/utils/services/admin-assessments'

export async function GET() {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const result = await listAdminAssessments({
    adminClient: auth.adminClient,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    assessments: result.data.assessments,
    // Backward compatibility alias.
    surveys: result.data.assessments,
  })
}

export async function POST(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const result = await createAdminAssessment({
    adminClient: auth.adminClient,
    userId: auth.user.id,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'invalid_fields' ? 400 : 500
    return NextResponse.json(
      { ok: false, error: result.error, ...(result.message ? { message: result.message } : {}) },
      { status }
    )
  }

  return NextResponse.json({
    ok: true,
    assessment: result.data.assessment,
    // Backward compatibility alias.
    survey: result.data.assessment,
  }, { status: 201 })
}
