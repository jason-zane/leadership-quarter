import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getOrgAllAssessmentQuotaStatuses } from '@/utils/services/org-quota'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params
  const statuses = await getOrgAllAssessmentQuotaStatuses(auth.adminClient, organisationId)

  return NextResponse.json({ ok: true, statuses })
}
