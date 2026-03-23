import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { getOrgAllAssessmentQuotaStatuses } from '@/utils/services/org-quota'

export async function GET() {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const statuses = await getOrgAllAssessmentQuotaStatuses(auth.adminClient, auth.context.organisationId)

  return NextResponse.json({ ok: true, statuses })
}
