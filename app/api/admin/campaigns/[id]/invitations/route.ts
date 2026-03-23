import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { rateLimitFor } from '@/utils/services/platform-settings-runtime'
import { getPublicBaseUrl } from '@/utils/hosts'
import { createAdminCampaignInvitations } from '@/utils/services/admin-assessment-invitations'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const rateLimit = await checkRateLimit(`admin-campaign-invitations:${auth.user.id}`, rateLimitFor('admin_invitation_create_rpm'), 60, {
    prefix: 'lq:auth-rl',
  })
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/admin/campaigns/invitations',
      scope: 'authenticated',
      bucket: 'admin-campaign-invitations',
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

  try {
    const result = await createAdminCampaignInvitations({
      adminClient: auth.adminClient,
      userId: auth.user.id,
      campaignId: id,
      publicBaseUrl: getPublicBaseUrl(),
      payload: await request.json().catch(() => null),
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          message: result.message,
          ...(result.errors ? { errors: result.errors } : {}),
        },
        { status: result.error === 'validation_error' ? 400 : result.error === 'not_found' ? 404 : 500 }
      )
    }

    return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
  } catch (error) {
    console.error('[admin-campaign-invitations] unhandled error', error)
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error creating invitations.' },
      { status: 500 }
    )
  }
}
