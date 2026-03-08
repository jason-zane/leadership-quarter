import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

function makeRequest(url: string, opts: { cookies?: Record<string, string>; headers?: Record<string, string> } = {}) {
  const req = new NextRequest(url, { headers: opts.headers ?? {} })
  if (opts.cookies) {
    for (const [name, value] of Object.entries(opts.cookies)) {
      req.cookies.set(name, value)
    }
  }
  return req
}

describe('middleware', () => {
  describe('/api/admin/* routes', () => {
    it('returns 401 with no auth cookie', async () => {
      const req = makeRequest('http://localhost:3001/api/admin/campaigns')
      const res = middleware(req)
      expect(res?.status).toBe(401)
      const body = await res?.json()
      expect(body).toEqual({ ok: false, error: 'unauthorized' })
    })

    it('passes when a Supabase auth cookie is present', () => {
      const req = makeRequest('http://localhost:3001/api/admin/campaigns', {
        cookies: { 'sb-abcdef-auth-token': 'some-token' },
      })
      const res = middleware(req)
      expect(res).toBeUndefined()
    })

    it('passes when cookie name contains -auth-token substring', () => {
      const req = makeRequest('http://localhost:3001/api/admin/organisations/123/members', {
        cookies: { 'sb-projectref-auth-token': 'tok' },
      })
      expect(middleware(req)).toBeUndefined()
    })

    it('returns 401 for nested admin route with no cookie', () => {
      const req = makeRequest('http://localhost:3001/api/admin/assessments/abc/questions')
      const res = middleware(req)
      expect(res?.status).toBe(401)
    })
  })

  describe('/api/portal/* routes', () => {
    it('returns 401 with no auth cookie', () => {
      const req = makeRequest('http://localhost:3001/api/portal/me')
      const res = middleware(req)
      expect(res?.status).toBe(401)
    })

    it('passes when a Supabase auth cookie is present', () => {
      const req = makeRequest('http://localhost:3001/api/portal/support', {
        cookies: { 'sb-xyz-auth-token': 'val' },
      })
      expect(middleware(req)).toBeUndefined()
    })
  })

  describe('/api/cron/* routes', () => {
    it('returns 401 with no auth header', () => {
      const req = makeRequest('http://localhost:3001/api/cron/email-jobs')
      const res = middleware(req)
      expect(res?.status).toBe(401)
    })

    it('passes with Authorization header', () => {
      const req = makeRequest('http://localhost:3001/api/cron/email-jobs', {
        headers: { authorization: 'Bearer secret123' },
      })
      expect(middleware(req)).toBeUndefined()
    })

    it('passes with x-cron-secret header', () => {
      const req = makeRequest('http://localhost:3001/api/cron/email-jobs', {
        headers: { 'x-cron-secret': 'secret123' },
      })
      expect(middleware(req)).toBeUndefined()
    })
  })

  describe('public assessment routes', () => {
    it('does not match /api/assessments/* — no middleware applied', () => {
      // Public assessment routes are not in the matcher, middleware doesn't run
      // but if it did, there is no auth check for this path in the function body
      const req = makeRequest('http://localhost:3001/api/assessments/campaigns/my-slug')
      expect(middleware(req)).toBeUndefined()
    })
  })
})
