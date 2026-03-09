import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before vi.mock calls that reference them
// ---------------------------------------------------------------------------
const { mockLimitFn } = vi.hoisted(() => {
  const mockLimitFn = vi.fn()
  return { mockLimitFn }
})

vi.mock('@upstash/ratelimit', () => {
  // Regular function (not arrow) so it can be used as a `new` target
  function RatelimitMock() {
    return { limit: mockLimitFn }
  }
  RatelimitMock.slidingWindow = vi.fn().mockReturnValue('sliding-window')
  return { Ratelimit: vi.fn(RatelimitMock) }
})

vi.mock('@upstash/redis', () => ({
  // Regular function so `new Redis(...)` works
  Redis: vi.fn(function RedisMock() { return {} }),
}))

import { classifyPublicRequest, getClientIp, checkRateLimit } from '@/utils/security/request-rate-limit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(method: string, pathname: string): Request {
  return new Request(`http://localhost${pathname}`, { method })
}

// ---------------------------------------------------------------------------
// classifyPublicRequest
// ---------------------------------------------------------------------------

describe('classifyPublicRequest', () => {
  it('POST to a write API path → public-write-api', () => {
    const req = makeRequest('POST', '/api/assessments/campaigns/test-slug/submit')
    expect(classifyPublicRequest(req)).toBe('public-write-api')
  })

  it('POST /api/inquiry → public-write-api', () => {
    const req = makeRequest('POST', '/api/inquiry')
    expect(classifyPublicRequest(req)).toBe('public-write-api')
  })

  it('GET to a read API path → public-read-api', () => {
    const req = makeRequest('GET', '/api/assessments/campaigns/my-slug')
    expect(classifyPublicRequest(req)).toBe('public-read-api')
  })

  it('GET to /api/assessments/invitation/token → public-read-api', () => {
    const req = makeRequest('GET', '/api/assessments/invitation/tok123')
    expect(classifyPublicRequest(req)).toBe('public-read-api')
  })

  it('GET to report export status → public-read-api', () => {
    const req = makeRequest('GET', '/api/reports/export/job-123')
    expect(classifyPublicRequest(req)).toBe('public-read-api')
  })

  it('GET to generated report PDF route → public-read-api', () => {
    const req = makeRequest('GET', '/api/reports/assessment/pdf')
    expect(classifyPublicRequest(req)).toBe('public-read-api')
  })

  it('GET to a page path → public-page', () => {
    const req = makeRequest('GET', '/c/some-campaign')
    expect(classifyPublicRequest(req)).toBe('public-page')
  })

  it('GET to /api/admin/* → bypass (not a public path)', () => {
    const req = makeRequest('GET', '/api/admin/campaigns')
    expect(classifyPublicRequest(req)).toBe('bypass')
  })

  it('OPTIONS → bypass', () => {
    const req = makeRequest('OPTIONS', '/api/assessments/campaigns/slug')
    expect(classifyPublicRequest(req)).toBe('bypass')
  })

  it('GET /api/cron/ → bypass', () => {
    const req = makeRequest('GET', '/api/cron/email-jobs')
    expect(classifyPublicRequest(req)).toBe('bypass')
  })

  it('POST to non-listed API → bypass', () => {
    const req = makeRequest('POST', '/api/admin/campaigns')
    expect(classifyPublicRequest(req)).toBe('bypass')
  })
})

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------

describe('getClientIp', () => {
  it('returns first IP from x-forwarded-for with multiple IPs', () => {
    const headers = new Headers({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 10.0.0.3' })
    expect(getClientIp({ headers })).toBe('10.0.0.1')
  })

  it('returns single IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.5' })
    expect(getClientIp({ headers })).toBe('203.0.113.5')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '192.168.1.1' })
    expect(getClientIp({ headers })).toBe('192.168.1.1')
  })

  it('returns "unknown" when no IP headers present', () => {
    const headers = new Headers()
    expect(getClientIp({ headers })).toBe('unknown')
  })

  it('x-forwarded-for takes precedence over x-real-ip', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '9.9.9.9' })
    expect(getClientIp({ headers })).toBe('1.2.3.4')
  })
})

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('Redis unavailable (no env vars) → graceful degrade: allowed=true', async () => {
    const result = await checkRateLimit('test-key', 30, 60)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(30)
  })

  it('placeholder Upstash env vars → graceful degrade: allowed=true', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'replace_with_upstash_rest_url'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'replace_with_upstash_rest_token'

    const result = await checkRateLimit('test-placeholder', 30, 60)

    expect(result.allowed).toBe(true)
    expect(mockLimitFn).not.toHaveBeenCalled()
  })

  it('limit exceeded → allowed=false with retryAfterSeconds', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

    const reset = Date.now() + 10_000
    mockLimitFn.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset,
      pending: Promise.resolve(),
    })

    // Use a unique prefix to bypass the ratelimitCache
    const result = await checkRateLimit('test-exceeded', 30, 60, { prefix: `test-prefix-${Date.now()}` })

    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })

  it('Redis runtime failure → graceful degrade: allowed=true', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'
    mockLimitFn.mockRejectedValue(new Error('redis offline'))

    const result = await checkRateLimit('test-runtime-failure', 30, 60, {
      prefix: `test-runtime-prefix-${Date.now()}`,
    })

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(30)
  })
})
