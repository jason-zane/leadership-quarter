import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { updateAdminAssessmentParticipantLifecycle } from '@/utils/services/admin-assessment-participants'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => null) as { action?: unknown } | null
  const action = body?.action
  if (action !== 'archive' && action !== 'restore') {
    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 })
  }

  const { participantId } = await params
  const result = await updateAdminAssessmentParticipantLifecycle({
    adminClient: auth.adminClient,
    participantId,
    action,
  })

  if (!result.ok) {
    const status =
      result.error === 'participant_not_found'
        ? 404
        : result.error === 'participant_table_missing'
          ? 500
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, participant: result.data })
}
