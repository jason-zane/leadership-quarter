import { NextResponse } from 'next/server'
import { getRuntimePublicAssessment } from '@/utils/services/assessment-runtime-public'

export async function GET(request: Request, { params }: { params: Promise<{ assessmentKey: string }> }) {
  const { assessmentKey } = await params
  const url = new URL(request.url)
  const result = await getRuntimePublicAssessment({
    assessmentKey,
    forceV2: url.searchParams.get('engine') === 'v2',
  })

  if (!result.ok) {
    const status = result.error === 'assessment_not_found' ? 404 : 500

    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
