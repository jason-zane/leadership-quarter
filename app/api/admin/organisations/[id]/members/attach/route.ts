import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  attachOrganisationMember,
  type PortalRole,
} from '@/utils/services/organisation-members'

function getErrorStatus(error: string) {
  if (error === 'invalid_payload') {
    return 400
  }

  if (error === 'user_not_found') {
    return 404
  }

  if (error === 'membership_conflict') {
    return 409
  }

  return 500
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params
  const body = (await request.json().catch(() => null)) as {
    email?: string
    role?: PortalRole
    userId?: string
  } | null

  const result = await attachOrganisationMember({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    organisationId,
    payload: body,
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.message ? { message: result.message } : {}),
      },
      { status: getErrorStatus(result.error) }
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
