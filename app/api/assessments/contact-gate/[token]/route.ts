import { NextResponse } from 'next/server'
import { getAssessmentContactGate } from '@/utils/services/assessment-contact-gate'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await getAssessmentContactGate({ token })

  if (!result.ok) {
    const status =
      result.error === 'submission_not_found'
        ? 404
        : result.error === 'gate_expired' || result.error === 'gate_invalid'
          ? 410
          : 500

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
