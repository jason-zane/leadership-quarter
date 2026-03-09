import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { assertSameOrigin } from '@/utils/security/origin'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import {
  submitPortalSupportRequest,
  type PortalSupportPayload,
} from '@/utils/services/portal-support'

export async function POST(request: Request) {
  try {
    await assertSameOrigin()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_origin', message: 'Invalid request origin.' }, { status: 403 })
  }

  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const rateLimit = await checkRateLimit(`portal_support:${auth.user.id}`, 10, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/portal/support',
      scope: 'authenticated',
      bucket: 'portal-support',
      identifierType: 'user',
      identifier: auth.user.id,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited', message: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await submitPortalSupportRequest({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    organisationSlug: auth.context.organisationSlug,
    userId: auth.user.id,
    userEmail: auth.user.email,
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
    payload: (await request.json().catch(() => null)) as PortalSupportPayload | null,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: result.error === 'support_email_not_configured' ? 500 : 400 }
    )
  }

  return NextResponse.json({ ok: true, requestId: result.data.requestId })
}
