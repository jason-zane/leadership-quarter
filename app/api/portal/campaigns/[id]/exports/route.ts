import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import {
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { rateLimitFor } from '@/utils/services/platform-settings-runtime'
import { exportPortalCampaignResponsesCsv } from '@/utils/services/portal-campaign-workspace'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const rateLimit = await checkRateLimit(`portal-campaign-export:${auth.user.id}`, rateLimitFor('portal_export_rpm'), 60, {
    prefix: 'lq:auth-rl',
  })
  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route: '/api/portal/campaigns/exports',
      scope: 'authenticated',
      bucket: 'portal-campaign-export',
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
  const result = await exportPortalCampaignResponsesCsv({
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

  return new NextResponse(result.data.csv, {
    status: 200,
    headers: {
      'cache-control': 'private, no-store, max-age=0',
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${result.data.filename}"`,
    },
  })
}
