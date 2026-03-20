import { NextResponse } from 'next/server'
import { getRuntimeInvitationAssessment } from '@/utils/services/assessment-runtime-invitation'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await getRuntimeInvitationAssessment({ token })

  if (!result.ok) {
    const status =
      result.error === 'invitation_not_found'
        ? 404
        : result.error === 'invitation_completed' ||
            result.error === 'invitation_expired' ||
            result.error === 'assessment_not_active'
          ? 410
          : 500

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
