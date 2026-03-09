import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/security/origin', () => ({ assertSameOrigin: vi.fn() }))
vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/framework-report-download', () => ({
  requestAiReadinessReportDownload: vi.fn(),
  requestLq8ReportDownload: vi.fn(),
}))

import { POST as postAiReadiness } from '@/app/api/reports/ai-readiness/request-download/route'
import { POST as postLq8 } from '@/app/api/reports/lq8/request-download/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { assertSameOrigin } from '@/utils/security/origin'
import {
  requestAiReadinessReportDownload,
  requestLq8ReportDownload,
} from '@/utils/services/framework-report-download'

const allowedRateLimit = { allowed: true, limit: 10, remaining: 9, reset: 0 }

function makeRequest(url: string, body: Record<string, unknown> = {}) {
  return new Request(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(assertSameOrigin).mockResolvedValue(undefined)
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('framework report download routes', () => {
  describe('POST /api/reports/ai-readiness/request-download', () => {
    it('returns 403 when the origin check fails', async () => {
      vi.mocked(assertSameOrigin).mockRejectedValue(new Error('invalid origin'))

      const res = await postAiReadiness(makeRequest('http://localhost/api/reports/ai-readiness/request-download'))

      expect(res.status).toBe(403)
    })

    it('returns 429 when rate limited', async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 30_000,
        retryAfterSeconds: 30,
      })

      const res = await postAiReadiness(makeRequest('http://localhost/api/reports/ai-readiness/request-download'))

      expect(res.status).toBe(429)
    })

    it('returns the report access payload on success', async () => {
      vi.mocked(requestAiReadinessReportDownload).mockResolvedValue({
        ok: true,
        data: {
          submissionId: 'sub-1',
          reportPath: '/framework/lq-ai-readiness/report',
          reportAccessToken: 'report-token',
        },
      })

      const res = await postAiReadiness(
        makeRequest('http://localhost/api/reports/ai-readiness/request-download', {
          firstName: 'Ada',
        })
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.reportAccessToken).toBe('report-token')
    })

    it('maps invalid field errors to 400', async () => {
      vi.mocked(requestAiReadinessReportDownload).mockResolvedValue({
        ok: false,
        error: 'invalid_fields',
      })

      const res = await postAiReadiness(makeRequest('http://localhost/api/reports/ai-readiness/request-download'))

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/reports/lq8/request-download', () => {
    it('returns the report access payload on success', async () => {
      vi.mocked(requestLq8ReportDownload).mockResolvedValue({
        ok: true,
        data: {
          submissionId: 'sub-2',
          reportPath: '/framework/lq8/report',
          reportAccessToken: 'report-token',
        },
      })

      const res = await postLq8(makeRequest('http://localhost/api/reports/lq8/request-download'))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.reportPath).toBe('/framework/lq8/report')
    })

    it('maps service failures to 500', async () => {
      vi.mocked(requestLq8ReportDownload).mockResolvedValue({
        ok: false,
        error: 'missing_service_role',
        message: 'Supabase admin credentials are not configured.',
      })

      const res = await postLq8(makeRequest('http://localhost/api/reports/lq8/request-download'))

      expect(res.status).toBe(500)
    })
  })
})
