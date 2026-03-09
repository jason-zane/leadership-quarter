import { NextResponse } from 'next/server'
import { getAssessmentInvitation } from '@/utils/services/assessment-invitation-access'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await getAssessmentInvitation({ token })

  if (!result.ok) {
    return NextResponse.json(
      result.message
        ? { ok: false, error: result.error, message: result.message }
        : { ok: false, error: result.error },
      {
        status:
          result.error === 'missing_service_role'
            ? 500
            : result.error === 'invitation_not_found'
              ? 404
              : result.error === 'questions_load_failed'
                ? 500
                : 410,
      }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
