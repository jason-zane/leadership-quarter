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

function makeAdminClientMock(profileRole: string | null, membership: Record<string, unknown> | null, orgRows: Record<string, unknown>[] = []) {
  const queryBuilderProfile = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: profileRole ? { role: profileRole } : null,
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
    const adminMock = makeAdminClientMock('staff', {
      id: 'mem-1',
      organisation_id: 'org-1',
      role: 'org_member',
      status: 'active',
      organisations: { slug: 'acme' },
    })
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)

    const result = await resolvePortalContext()

    expect(result.context).not.toBeNull()
    expect(result.context?.role).toBe('org_member')
    expect(result.context?.organisationSlug).toBe('acme')
    expect(result.context?.source).toBe('membership')
    expect(result.context?.isBypassAdmin).toBe(false)
  })

  it('admin user with no membership and no org cookie → falls back to first active org', async () => {
    const user = { id: 'admin-1', email: 'admin@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)
    const adminMock = makeAdminClientMock('admin', null, [{ id: 'org-1', slug: 'first-org' }])
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue(undefined) } as never)

    const result = await resolvePortalContext()

    expect(result.context?.source).toBe('admin_bypass')
    expect(result.context?.isBypassAdmin).toBe(true)
    expect(result.context?.organisationSlug).toBe('first-org')
  })

  it('admin user with org cookie set → uses cookie org id', async () => {
    const user = { id: 'admin-2', email: 'admin2@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)

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
            maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
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
      get: vi.fn().mockReturnValue({ value: 'org-2' }),
    } as never)

    const result = await resolvePortalContext()

    expect(result.context?.organisationSlug).toBe('cookie-org')
    expect(result.context?.isBypassAdmin).toBe(true)
  })

  it('non-admin user with no membership → returns null context', async () => {
    const user = { id: 'user-2', email: 'staff@example.com' }
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(user) as never)
    const adminMock = makeAdminClientMock('staff', null)
    vi.mocked(createAdminClient).mockReturnValue(adminMock as never)

    const result = await resolvePortalContext()

    expect(result.context).toBeNull()
    expect(result.userId).toBe('user-2')
  })
})
