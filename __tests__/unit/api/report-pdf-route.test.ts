import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/services/report-pdf', () => ({
  downloadReportPdf: vi.fn(),
}))

import { GET } from '@/app/api/reports/[reportType]/pdf/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { downloadReportPdf } from '@/utils/services/report-pdf'

const allowedRateLimit = { allowed: true, limit: 10, remaining: 9, reset: 0 }

function makeRequest(path = 'http://localhost/api/reports/assessment/pdf?access=good-token') {
  return new Request(path)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
})

describe('GET /api/reports/[reportType]/pdf', () => {
  it('returns 404 for an unsupported report type', async () => {
    const response = await GET(makeRequest(), {
      params: Promise.resolve({ reportType: 'unknown' }),
    })

    expect(response.status).toBe(404)
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ reportType: 'assessment' }),
    })

    expect(response.status).toBe(429)
  })

  it('streams the generated PDF on success', async () => {
    vi.mocked(downloadReportPdf).mockResolvedValue({
      ok: true,
      data: {
        filename: 'assessment-report.pdf',
        pdfBuffer: Buffer.from('%PDF-test'),
      },
    })

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ reportType: 'assessment' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toContain('assessment-report.pdf')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toContain('%PDF-test')
  })
})
