import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import {
  listPortalParticipants,
  parsePortalParticipantsQuery,
} from '@/utils/services/portal-participants'

export async function GET(request: Request) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const result = await listPortalParticipants({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    filters: parsePortalParticipantsQuery(searchParams),
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: result.error === 'forbidden' ? 403 : 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
