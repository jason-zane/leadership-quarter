import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { rateLimitFor } from '@/utils/services/platform-settings-runtime'
import {
  createAdminAssessmentInvitations,
  listAdminAssessmentInvitations,
} from '@/utils/services/admin-assessment-invitations'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const result = await listAdminAssessmentInvitations({
    adminClient: auth.adminClient,
    assessmentId: id,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const rateLimit = await checkRateLimit(`admin-assessment-invitations:${auth.user.id}`, rateLimitFor('admin_invitation_create_rpm'), 60, {
    prefix: 'lq:auth-rl',
  })
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/admin/assessments/invitations',
      scope: 'authenticated',
      bucket: 'admin-assessment-invitations',
      identifierType: 'user',
      identifier: auth.user.id,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const { id } = await params
  const result = await createAdminAssessmentInvitations({
    adminClient: auth.adminClient,
    userId: auth.user.id,
    assessmentId: id,
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
