import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { getPortalBaseUrl } from '@/utils/hosts'
import {
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { rateLimitFor } from '@/utils/services/platform-settings-runtime'
import {
  createPortalCampaignInvitations,
  listPortalCampaignInvitations,
} from '@/utils/services/portal-campaign-invitations'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params
  const result = await listPortalCampaignInvitations({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    campaignId,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: result.error === 'not_found' ? 404 : 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth({
    allowedRoles: ['org_owner', 'org_admin', 'campaign_manager'],
  })
  if (!auth.ok) return auth.response

  const rateLimit = await checkRateLimit(`portal-campaign-invitations:${auth.user.id}`, rateLimitFor('portal_invitation_send_rpm'), 60, {
    prefix: 'lq:auth-rl',
  })
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/portal/campaigns/invitations',
      scope: 'authenticated',
      bucket: 'portal-campaign-invitations',
      identifierType: 'user',
      identifier: auth.user.id,
      result: rateLimit,
    })
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    )
  }

  const { id: campaignId } = await params
  const result = await createPortalCampaignInvitations({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    userId: auth.user.id,
    campaignId,
    portalBaseUrl: getPortalBaseUrl(),
    payload: (await request.json().catch(() => null)) as unknown,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message, errors: result.errors },
      { status: result.error === 'not_found' ? 404 : result.error === 'internal_error' ? 500 : 400 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
