import { NextResponse } from 'next/server'
import { getRuntimePublicAssessment } from '@/utils/services/assessment-runtime-public'

export async function GET(request: Request, { params }: { params: Promise<{ assessmentKey: string }> }) {
  const { assessmentKey } = await params
  const result = await getRuntimePublicAssessment({ assessmentKey })

  if (!result.ok) {
    const status = result.error === 'assessment_not_found' ? 404 : 500

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
