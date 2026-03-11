import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { updateAdminReportVariant } from '@/utils/services/admin-report-variants'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, variantId } = await params
  const result = await updateAdminReportVariant({
    adminClient: auth.adminClient,
    assessmentId,
    variantId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'variant_not_found'
        ? 404
        : result.error === 'invalid_payload'
          ? 400
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
