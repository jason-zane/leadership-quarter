import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

type Role = 'admin' | 'staff'

export type RouteAuthSuccess = {
  ok: true
  user: User
  role: Role
  adminClient: NonNullable<ReturnType<typeof createAdminClient>>
}

export type RouteAuthFailure = {
  ok: false
  response: NextResponse
}

export async function requireDashboardApiAuth(options?: { adminOnly?: boolean }) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    } as RouteAuthFailure
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: 'missing_service_role',
          message: 'Supabase admin credentials are not configured.',
        },
        { status: 500 }
      ),
    } as RouteAuthFailure
  }

  const { data: roleRow, error: roleError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const role = (roleRow as { role?: Role } | null)?.role
  if (roleError || (role !== 'admin' && role !== 'staff')) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }),
    } as RouteAuthFailure
  }

  if (options?.adminOnly && role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'admin_required' }, { status: 403 }),
    } as RouteAuthFailure
  }

  return {
    ok: true,
    user,
    role,
    adminClient,
  } as RouteAuthSuccess
}
