import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { getPortalParticipantResult } from '@/utils/services/portal-participants'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { submissionId } = await params
  const result = await getPortalParticipantResult({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    submissionId,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
