import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  listOrganisationAssessmentAccess,
  upsertOrganisationAssessmentAccess,
} from '@/utils/services/organisation-assessment-access'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params
  const result = await listOrganisationAssessmentAccess({
    adminClient: auth.adminClient,
    organisationId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params
  const result = await upsertOrganisationAssessmentAccess({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    organisationId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    const status = result.error === 'assessment_id_required' ? 400 : 500
    return NextResponse.json(
      { ok: false, error: result.error, ...(result.message ? { message: result.message } : {}) },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
