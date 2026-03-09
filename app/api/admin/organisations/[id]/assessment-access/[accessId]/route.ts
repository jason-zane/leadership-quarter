import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  deleteOrganisationAssessmentAccess,
  updateOrganisationAssessmentAccess,
} from '@/utils/services/organisation-assessment-access'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; accessId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId, accessId } = await params
  const result = await updateOrganisationAssessmentAccess({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    organisationId,
    accessId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'invalid_payload' ? 400 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; accessId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId, accessId } = await params
  const result = await deleteOrganisationAssessmentAccess({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    organisationId,
    accessId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
