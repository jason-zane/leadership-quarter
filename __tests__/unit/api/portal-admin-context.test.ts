import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/utils/portal-api-auth', () => ({
  requirePortalApiAuth: vi.fn(),
}))
vi.mock('@/utils/portal-bypass-session', () => ({
  writePortalAdminBypassCookies: vi.fn(),
}))

import { POST } from '@/app/api/portal/admin/context/route'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { writePortalAdminBypassCookies } from '@/utils/portal-bypass-session'

function makeAuthFailure(status = 401) {
  return {
    ok: false as const,
    response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status }),
  }
}

function makeAuthSuccess(options?: { bypassAdmin?: boolean; organisationFound?: boolean }) {
  return {
    ok: true as const,
    user: { id: 'admin-1', email: 'admin@example.com' },
    context: {
      organisationId: 'org-1',
      isBypassAdmin: options?.bypassAdmin ?? true,
      role: 'org_owner',
    },
    adminClient: {
      from: vi.fn((table: string) => {
        if (table === 'organisations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: options?.organisationFound === false ? null : { id: 'org-2' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }

        if (table === 'admin_audit_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      }),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(writePortalAdminBypassCookies).mockReturnValue(true)
})

describe('POST /api/portal/admin/context', () => {
  it('returns auth failure directly', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(makeAuthFailure(403) as never)

    const response = await POST(
      new NextRequest('http://localhost/api/portal/admin/context', {
        method: 'POST',
        body: JSON.stringify({ organisation_id: 'org-2' }),
        headers: { 'content-type': 'application/json' },
      })
    )

    expect(response.status).toBe(403)
  })

  it('rejects non-bypass admins', async () => {
    vi.mocked(requirePortalApiAuth).mockResolvedValue(
      makeAuthSuccess({ bypassAdmin: false }) as never
    )

    const response = await POST(
      new NextRequest('http://localhost/api/portal/admin/context', {
        method: 'POST',
        body: JSON.stringify({ organisation_id: 'org-2' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toBe('forbidden')
  })

  it('writes bypass cookies and records an audit log on success', async () => {
    const auth = makeAuthSuccess()
    vi.mocked(requirePortalApiAuth).mockResolvedValue(auth as never)

    const response = await POST(
      new NextRequest('http://localhost/api/portal/admin/context', {
        method: 'POST',
        body: JSON.stringify({ organisation_id: 'org-2' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(writePortalAdminBypassCookies).toHaveBeenCalledOnce()
    expect(auth.adminClient.from).toHaveBeenCalledWith('admin_audit_logs')
  })
})
