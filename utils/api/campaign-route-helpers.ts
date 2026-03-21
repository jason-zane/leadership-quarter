import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { logRequest } from '@/utils/logger'
import {
  getClientIp,
  getRateLimitHeaders,
  logRateLimitExceededForRequest,
} from '@/utils/security/request-rate-limit'
import { rateLimitFor } from '@/utils/services/platform-settings-runtime'
import type {
  RegisterAssessmentCampaignResult,
  SubmitAssessmentCampaignResult,
} from '@/utils/services/assessment-campaign-entry'

export async function checkCampaignRateLimit(
  request: Request,
  route: string,
  key: 'campaign-register' | 'campaign-submit'
): Promise<{ ip: string; rateLimitedResponse: NextResponse | null }> {
  const ip = getClientIp(request)
  const rateLimit = await checkRateLimit(`${key}:${ip}`, rateLimitFor('assessment_submit_rpm'), 60)

  if (!rateLimit.allowed) {
    logRateLimitExceededForRequest({
      request,
      route,
      scope: 'public',
      bucket: key,
      identifierType: 'ip',
      identifier: ip,
      result: rateLimit,
    })
    return {
      ip,
      rateLimitedResponse: NextResponse.json(
        { ok: false, error: 'rate_limited' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      ),
    }
  }

  return { ip, rateLimitedResponse: null }
}

export function campaignRegisterErrorMessage(error: string): string {
  if (error === 'campaign_limit_reached') return 'This campaign has reached its assessment limit.'
  if (error === 'campaign_not_active') return 'This campaign is no longer accepting responses.'
  if (error === 'survey_not_active' || error === 'assessment_not_active')
    return 'The assessment for this campaign is currently unavailable.'
  return error
}

export function campaignRegisterErrorResponse(result: RegisterAssessmentCampaignResult): NextResponse {
  if (result.ok) return NextResponse.json({ ok: true, ...result.data })

  const status =
    result.error === 'invalid_payload' || result.error === 'invalid_fields'
      ? 400
      : result.error === 'campaign_not_found'
        ? 404
        : result.error === 'campaign_not_active' ||
            result.error === 'campaign_limit_reached' ||
            result.error === 'survey_not_active'
          ? 410
          : 500

  return NextResponse.json(
    { ok: false, error: result.error, message: campaignRegisterErrorMessage(result.error) },
    { status }
  )
}

export function campaignSubmitErrorResponse(
  result: SubmitAssessmentCampaignResult,
  route: string,
  t0: number,
  traceId: string | undefined
): NextResponse {
  if (result.ok) {
    logRequest({ route, status: 200, durationMs: Date.now() - t0, traceId, assessmentId: result.assessmentId })
    return NextResponse.json({ ok: true, ...result.data })
  }

  const status =
    result.error === 'invalid_payload' || result.error === 'invalid_responses' || result.error === 'invalid_fields'
      ? 400
      : result.error === 'campaign_not_found'
        ? 404
        : result.error === 'campaign_not_active' ||
            result.error === 'campaign_limit_reached' ||
            result.error === 'assessment_not_active'
          ? 410
          : 500

  logRequest({ route, status, durationMs: Date.now() - t0, traceId, assessmentId: result.assessmentId, error: result.error })

  return NextResponse.json(
    { ok: false, error: result.error, message: campaignRegisterErrorMessage(result.error) },
    { status }
  )
}
