import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { updateAdminScoringModel } from '@/utils/services/admin-scoring-models'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, modelId } = await params
  const result = await updateAdminScoringModel({
    adminClient: auth.adminClient,
    assessmentId,
    scoringModelId: modelId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status =
      result.error === 'scoring_model_not_found'
        ? 404
        : result.error === 'invalid_payload'
          ? 400
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
