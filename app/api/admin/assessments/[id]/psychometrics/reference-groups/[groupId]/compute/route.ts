import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { computeAdminAssessmentReferenceGroup } from '@/utils/services/admin-assessment-psychometrics'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; groupId: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id, groupId } = await params
  const result = await computeAdminAssessmentReferenceGroup({
    adminClient: auth.adminClient,
    assessmentId: id,
    groupId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
