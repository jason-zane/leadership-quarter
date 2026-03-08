import { test, expect } from '@playwright/test'

/**
 * Middleware rejection tests — hit protected API routes with no credentials
 * and assert the 401 JSON response is returned before route handlers run.
 */
test.describe('Middleware — unauthenticated API rejection', () => {
  test('GET /api/admin/campaigns with no cookies → 401', async ({ request }) => {
    const res = await request.get('/api/admin/campaigns')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, error: 'unauthorized' })
  })

  test('GET /api/portal/me with no cookies → 401', async ({ request }) => {
    const res = await request.get('/api/portal/me')
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, error: 'unauthorized' })
  })

  test('POST /api/cron/email-jobs with no Authorization → 401', async ({ request }) => {
    const res = await request.post('/api/cron/email-jobs', {
      headers: { 'content-type': 'application/json' },
      data: {},
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body).toMatchObject({ ok: false, error: 'unauthorized' })
  })

  test('GET /api/assessments/campaigns/some-slug → not blocked by middleware', async ({ request }) => {
    // This route is not protected by middleware — it may return 404 (no such campaign)
    // but must NOT return 401 from middleware
    const res = await request.get('/api/assessments/campaigns/nonexistent-slug-test')
    expect(res.status()).not.toBe(401)
  })
})
