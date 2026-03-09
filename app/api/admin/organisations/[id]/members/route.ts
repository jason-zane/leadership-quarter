import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  inviteOrganisationMember,
  listOrganisationMembers,
  type InviteMode,
  type PortalRole,
} from '@/utils/services/organisation-members'

function getErrorStatus(error: string) {
  if (error === 'invalid_payload') {
    return 400
  }
  return 500
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params
  const result = await listOrganisationMembers({
    adminClient: auth.adminClient,
    organisationId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'members_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, members: result.data.members })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params

  const body = (await request.json().catch(() => null)) as {
    email?: string
    role?: PortalRole
    mode?: InviteMode
  } | null
  const result = await inviteOrganisationMember({
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
