import { NextRequest, NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { sendAdminTestEmail } from '@/utils/services/admin-email-test-send'

export async function POST(req: NextRequest) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const rateLimit = await checkRateLimit(`admin-email-test-send:${auth.user.id}`, 5, 60, {
    prefix: 'lq:auth-rl',
  })
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request: req,
      route: '/api/admin/email/test-send',
      scope: 'authenticated',
      bucket: 'admin-email-test-send',
      identifierType: 'user',
      identifier: auth.user.id,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const result = await sendAdminTestEmail({
    adminClient: auth.adminClient,
    payload: (await req.json().catch(() => ({}))) as Record<string, unknown>,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
