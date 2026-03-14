import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { runAdminAssessmentV2Validation } from '@/utils/services/admin-assessment-v2-psychometrics'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const payload = await request.json().catch(() => null) as {
    analysisType?: 'efa' | 'cfa' | 'invariance' | 'full_validation'
    normGroupId?: string | null
    groupingVariable?: string | null
    minimumSampleN?: number | null
  } | null

  const result = await runAdminAssessmentV2Validation({
    adminClient: auth.adminClient,
    assessmentId: id,
    payload,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, sampleN: 'sampleN' in result ? result.sampleN : undefined }, { status: 400 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
