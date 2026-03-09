import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/assessments/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/utils/security/request-rate-limit', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  getRateLimitHeaders: vi.fn().mockReturnValue(new Headers({ 'retry-after': '30' })),
  logRateLimitExceededForRequest: vi.fn(),
}))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/reports/assemble-report-document', () => ({
  assembleReportDocument: vi.fn(),
  resolveReportAccessPayload: vi.fn(),
}))
vi.mock('@/utils/services/report-export-jobs', () => ({
  createReportExportJob: vi.fn(),
  getReportExportStatus: vi.fn(),
}))

import { POST } from '@/app/api/reports/export/route'
import { GET } from '@/app/api/reports/export/[jobId]/route'
import { checkRateLimit } from '@/utils/assessments/rate-limit'
import { assembleReportDocument, resolveReportAccessPayload } from '@/utils/reports/assemble-report-document'
import { createAdminClient } from '@/utils/supabase/admin'
import { createReportExportJob, getReportExportStatus } from '@/utils/services/report-export-jobs'

const allowedRateLimit = { allowed: true, limit: 10, remaining: 9, reset: 0 }

function makePostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/reports/export', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeStatusRequest() {
  return new Request('http://localhost/api/reports/export/job-1?reportType=assessment&access=good-token')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockResolvedValue(allowedRateLimit)
  vi.mocked(createAdminClient).mockReturnValue({} as never)
  vi.mocked(resolveReportAccessPayload).mockReturnValue({ submissionId: 'sub-1' } as never)
  vi.mocked(assembleReportDocument).mockResolvedValue({ ok: true, data: {} as never })
})

describe('report export API routes', () => {
  it('queues an export job', async () => {
    vi.mocked(createReportExportJob).mockResolvedValue({
      ok: true,
      data: { jobId: 'job-1' },
    })

    const response = await POST(
      makePostRequest({
        reportType: 'assessment',
        access: 'good-token',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(202)
    expect(body.jobId).toBe('job-1')
  })

  it('returns 429 when export queueing is rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const response = await POST(
      makePostRequest({
        reportType: 'assessment',
        access: 'good-token',
      })
    )

    expect(response.status).toBe(429)
  })

  it('returns 503 with a message when queueing is unavailable', async () => {
    vi.mocked(createReportExportJob).mockResolvedValue({
      ok: false,
      error: 'queue_failed',
    })

    const response = await POST(
      makePostRequest({
        reportType: 'assessment',
        access: 'good-token',
      })
    )
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.error).toBe('queue_failed')
    expect(body.message).toContain('direct PDF download')
  })

  it('returns signed URL status for a ready export', async () => {
    vi.mocked(getReportExportStatus).mockResolvedValue({
      ok: true,
      data: {
        status: 'ready',
        signedUrl: 'https://storage.example.com/report.pdf',
      },
    })

    const response = await GET(makeStatusRequest(), {
      params: Promise.resolve({ jobId: 'job-1' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ready')
    expect(body.signedUrl).toContain('report.pdf')
  })

  it('returns 429 when export status polling is rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 30_000,
      retryAfterSeconds: 30,
    })

    const response = await GET(makeStatusRequest(), {
      params: Promise.resolve({ jobId: 'job-1' }),
    })

    expect(response.status).toBe(429)
  })
})
