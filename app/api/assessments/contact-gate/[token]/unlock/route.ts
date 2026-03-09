import { NextResponse } from 'next/server'
import {
  unlockAssessmentContactGate,
  type AssessmentContactGateUnlockPayload,
} from '@/utils/services/assessment-contact-gate'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await unlockAssessmentContactGate({
    token,
    payload: (await request.json().catch(() => null)) as AssessmentContactGateUnlockPayload | null,
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_fields'
        ? 400
        : result.error === 'submission_not_found'
          ? 404
          : result.error === 'gate_expired' || result.error === 'gate_invalid'
            ? 410
            : 500

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
