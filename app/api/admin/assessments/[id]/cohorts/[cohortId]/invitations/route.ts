import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import {
  createAdminCohortInvitations,
  listAdminAssessmentInvitations,
} from '@/utils/services/admin-assessment-invitations'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; cohortId: string }> }
) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id, cohortId } = await params
  const result = await listAdminAssessmentInvitations({
    adminClient: auth.adminClient,
    assessmentId: id,
    cohortId,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; cohortId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const rateLimit = await checkRateLimit(`admin-cohort-invitations:${auth.user.id}`, 6, 60, {
    prefix: 'lq:auth-rl',
  })
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/admin/assessments/cohort-invitations',
      scope: 'authenticated',
      bucket: 'admin-cohort-invitations',
      identifierType: 'user',
      identifier: auth.user.id,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const { id, cohortId } = await params
  const result = await createAdminCohortInvitations({
    adminClient: auth.adminClient,
    userId: auth.user.id,
    assessmentId: id,
    cohortId,
    payload: await request.json().catch(() => null),
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.message ? { message: result.message } : {}),
        ...(result.errors ? { errors: result.errors } : {}),
      },
      { status: result.error === 'invalid_invitations' ? 400 : 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
