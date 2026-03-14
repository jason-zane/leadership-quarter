import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { seedAdminAssessmentV2AiReadiness } from '@/utils/services/admin-assessment-v2-ai-readiness'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await seedAdminAssessmentV2AiReadiness({
    adminClient: auth.adminClient,
    assessmentId: id,
  })

  if (!result.ok) {
    const status =
      result.error === 'assessment_not_found'
        ? 404
        : result.error === 'assessment_not_supported'
          ? 400
          : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
