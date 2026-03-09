import { NextResponse } from 'next/server'
import { getPublicAssessment } from '@/utils/services/assessment-public-access'

export async function GET(_request: Request, { params }: { params: Promise<{ assessmentKey: string }> }) {
  const { assessmentKey } = await params
  const result = await getPublicAssessment({ assessmentKey })

  if (!result.ok) {
    const status = result.error === 'survey_not_found' ? 404 : 500
    return NextResponse.json(
      result.message
        ? { ok: false, error: result.error, message: result.message }
        : { ok: false, error: result.error },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
