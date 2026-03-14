import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

import { resolvePortalContext } from '@/utils/portal-context'
import { createPortalAdminBypassToken } from '@/utils/portal-bypass-session'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSupabaseClient(user: Record<string, unknown> | null) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
  }
}

function makeAdminClientMock(
  profile: { role: string; portal_admin_access?: boolean } | null,
  membership: Record<string, unknown> | null,
  orgRows: Record<string, unknown>[] = []
) {
  const queryBuilderProfile = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: profile
        ? {
            role: profile.role,
            portal_admin_access: profile.portal_admin_access === true,
          }
        : null,
      error: null,
    }),
  }
  const queryBuilderMembership = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: membership, error: null }),
  }
  const queryBuilderOrg = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: orgRows[0] ?? null, error: null }),
  }
  const auditInsert = { then: vi.fn().mockResolvedValue(undefined) }
  const auditBuilder = { insert: vi.fn().mockReturnValue(auditInsert) }

  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') return queryBuilderProfile
      if (table === 'organisation_memberships') return queryBuilderMembership
      if (table === 'organisations') return queryBuilderOrg
      if (table === 'admin_audit_logs') return auditBuilder
      return {}
    }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTH_HANDOFF_SECRET = 'test-secret'
})

describe('resolvePortalContext', () => {
  it('no authenticated user → returns null context', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(null) as never)

    const result = await resolvePortalContext()

    expect(result.context).toBeNull()
    expect(result.userId).toBe('')
  })

  it('user with active org membership → returns member context with correct role', async () => {
    const user = { id: 'user-1', email: 'member@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)
    const adminMock = makeAdminClientMock({ role: 'staff', portal_admin_access: false }, {
      id: 'mem-1',
      organisation_id: 'org-1',
      role: 'org_admin',
      status: 'active',
      organisations: { slug: 'acme' },
    })
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)

    const result = await resolvePortalContext()

    expect(result.context).not.toBeNull()
    expect(result.context?.role).toBe('org_admin')
    expect(result.context?.organisationSlug).toBe('acme')
    expect(result.context?.source).toBe('membership')
    expect(result.context?.isBypassAdmin).toBe(false)
  })

  it('admin user with no membership and no bypass cookie → returns null context', async () => {
    const user = { id: 'admin-1', email: 'admin@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)
    const adminMock = makeAdminClientMock(
      { role: 'admin', portal_admin_access: true },
      null,
      [{ id: 'org-1', slug: 'first-org' }]
    )
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) } as never)

    const result = await resolvePortalContext()

    expect(result.context).toBeNull()
  })

  it('admin user with a valid bypass cookie → uses the bypass organisation id', async () => {
    const user = { id: 'admin-2', email: 'admin2@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)
    const token = createPortalAdminBypassToken({
      userId: user.id,
      organisationId: 'org-2',
    })

    // Org query for cookie-selected org returns org-2
    const orgQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'org-2', slug: 'cookie-org' }, error: null }),
    }
    const auditInsert = { then: vi.fn().mockResolvedValue(undefined) }
    const adminMock = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { role: 'admin', portal_admin_access: true }, error: null }),
          }
        }
        if (table === 'organisation_memberships') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        if (table === 'organisations') return orgQueryBuilder
        if (table === 'admin_audit_logs') return { insert: vi.fn().mockReturnValue(auditInsert) }
        return {}
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === 'lq_portal_org_id') return { value: 'org-2' }
        if (name === 'lq_portal_bypass') return token ? { value: token } : undefined
        return undefined
      }),
    } as never)

    const result = await resolvePortalContext()

    expect(result.context?.organisationSlug).toBe('cookie-org')
    expect(result.context?.isBypassAdmin).toBe(true)
  })

  it('admin user with a mismatched bypass cookie → returns null context', async () => {
    const user = { id: 'admin-4', email: 'admin4@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)
    const adminMock = makeAdminClientMock(
      { role: 'admin', portal_admin_access: true },
      null,
      [{ id: 'org-1', slug: 'first-org' }]
    )
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)
    const token = createPortalAdminBypassToken({
      userId: user.id,
      organisationId: 'org-2',
    })

    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === 'lq_portal_org_id') return { value: 'org-1' }
        if (name === 'lq_portal_bypass') return token ? { value: token } : undefined
        return undefined
      }),
    } as never)

    const result = await resolvePortalContext()

    expect(result.context).toBeNull()
  })

  it('admin user without portal launch allowlist entry → returns null context', async () => {
    const user = { id: 'admin-3', email: 'plain-admin@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)
    const adminMock = makeAdminClientMock(
      { role: 'admin', portal_admin_access: false },
      null,
      [{ id: 'org-1', slug: 'first-org' }]
    )
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)

    const result = await resolvePortalContext()

    expect(result.context).toBeNull()
    expect(result.userId).toBe('admin-3')
  })

  it('non-admin user with no membership → returns null context', async () => {
    const user = { id: 'user-2', email: 'staff@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)
    const adminMock = makeAdminClientMock({ role: 'staff', portal_admin_access: false }, null)
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)

    const result = await resolvePortalContext()

    expect(result.context).toBeNull()
    expect(result.userId).toBe('user-2')
  })
})
