import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { logRequest } from '@/utils/logger'
import {
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { submitAssessmentInvitation } from '@/utils/services/assessment-invitation-submission'

export const maxDuration = 30

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const t0 = Date.now()
  const traceId = request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id') ?? undefined
  const url = new URL(request.url)

  const { token } = await params

  // Rate limit by token: 5 submissions per minute
  const rateLimit = await checkRateLimit(`submit:${token}`, 5, 60)
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/assessments/invitation/submit',
      scope: 'public',
      bucket: 'invitation-submit',
      identifierType: 'token',
      identifier: token,
      result: rateLimit,
    })
    logRequest({ route: '/api/assessments/invitation/submit', status: 429, durationMs: Date.now() - t0, traceId })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await submitAssessmentInvitation({
    token,
    payload: await request.json().catch(() => null),
    runtimeMode: url.searchParams.get('engine') === 'v2' ? 'v2' : 'default',
  })

  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' || result.error === 'invalid_responses'
        ? 400
        : result.error === 'invitation_not_found'
          ? 404
          : result.error === 'survey_not_active' ||
              result.error === 'invitation_expired' ||
              result.error === 'invitation_completed'
            ? 410
            : 500

    logRequest({
      route: '/api/assessments/invitation/submit',
      status,
      durationMs: Date.now() - t0,
      traceId,
      invitationId: result.invitationId,
      assessmentId: result.assessmentId,
      error: result.error,
    })

    return NextResponse.json(
      result.message
        ? { ok: false, error: result.error, message: result.message }
        : { ok: false, error: result.error },
      { status }
    )
  }

  logRequest({
    route: '/api/assessments/invitation/submit',
    status: 200,
    durationMs: Date.now() - t0,
    traceId,
    invitationId: result.invitationId,
    assessmentId: result.assessmentId,
  })

  return NextResponse.json({ ok: true, ...result.data })
}
