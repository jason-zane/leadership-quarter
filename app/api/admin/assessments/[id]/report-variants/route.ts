import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  createAdminReportVariant,
  listAdminReportVariants,
} from '@/utils/services/admin-report-variants'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await listAdminReportVariants({
    adminClient: auth.adminClient,
    assessmentId,
  })

  if (!result.ok) {
    const status = result.error === 'assessment_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await createAdminReportVariant({
    adminClient: auth.adminClient,
    assessmentId,
    userId: auth.user.id,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'assessment_not_found' || result.error === 'definition_not_found'
        ? 404
        : result.error === 'invalid_payload' || result.error === 'definition_incompatible'
          ? 400
          : 500
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.ok ? {} : 'message' in result ? { message: result.message } : {}),
      },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
