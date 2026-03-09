import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getAdminAssessmentAnalytics } from '@/utils/services/admin-assessment-analytics'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const result = await getAdminAssessmentAnalytics({
    adminClient: auth.adminClient,
    assessmentId,
  })

  return NextResponse.json({ ok: true, ...result.data })
}
