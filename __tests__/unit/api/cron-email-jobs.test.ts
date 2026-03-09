import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/services/cron-email-jobs', () => ({ runPendingEmailJobs: vi.fn() }))

import { GET } from '@/app/api/cron/email-jobs/route'
import { createAdminClient } from '@/utils/supabase/admin'
import { runPendingEmailJobs } from '@/utils/services/cron-email-jobs'

function makeRequest(token?: string) {
  return new Request('http://localhost/api/cron/email-jobs', {
    method: 'GET',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'secret-123'
})

describe('GET /api/cron/email-jobs', () => {
  it('returns 500 when cron secret is not configured', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(makeRequest('secret-123'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('cron_not_configured')
  })

  it('returns 401 for invalid token', async () => {
    const res = await GET(makeRequest('wrong'))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('unauthorized')
  })

  it('returns 500 when admin client is unavailable', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const res = await GET(makeRequest('secret-123'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('missing_service_role')
  })

  it('returns the runner result on success', async () => {
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn() } as never)
    vi.mocked(runPendingEmailJobs).mockResolvedValue({
      ok: true,
      data: {
        fetched: 3,
        sent: 2,
        failed: 1,
        skipped: 0,
      },
    })

    const res = await GET(makeRequest('secret-123'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      ok: true,
      fetched: 3,
      sent: 2,
      failed: 1,
      skipped: 0,
    })
  })

  it('maps runner errors to 500', async () => {
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn() } as never)
    vi.mocked(runPendingEmailJobs).mockResolvedValue({
      ok: false,
      error: 'job_fetch_failed',
    })

    const res = await GET(makeRequest('secret-123'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('job_fetch_failed')
  })
})
