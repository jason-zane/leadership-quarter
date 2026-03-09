import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  deleteOrganisationMember,
  type MembershipStatus,
  type PortalRole,
  updateOrganisationMember,
} from '@/utils/services/organisation-members'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId, membershipId } = await params
  const result = await updateOrganisationMember({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    organisationId,
    membershipId,
    payload: (await request.json().catch(() => null)) as { role?: PortalRole; status?: MembershipStatus } | null,
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' || result.error === 'invalid_role' || result.error === 'invalid_status'
        ? 400
        : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; membershipId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId, membershipId } = await params
  const result = await deleteOrganisationMember({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    organisationId,
    membershipId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
