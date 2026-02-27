import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { isAdminEmail } from '@/utils/admin-access'
import { createAdminClient } from '@/utils/supabase/admin'

// Access is granted in two ways:
// 1) Profile row with role='admin' in the database (normal operation)
// 2) Email in ADMIN_DASHBOARD_EMAILS + ALLOW_ADMIN_EMAIL_BOOTSTRAP=true (initial setup only)
// Once an admin account exists in the database, disable bootstrap by setting
// ALLOW_ADMIN_EMAIL_BOOTSTRAP=false (or removing it).

type ProfileRoleRow = {
  role: 'admin' | 'staff'
}

type DashboardRole = 'admin' | 'staff'
type DashboardUser = {
  id: string
  email?: string | null
}

type DashboardAuthResult =
  | {
      user: DashboardUser
      authorized: true
      role: DashboardRole
      bootstrap?: true
    }
  | {
      user: DashboardUser
      authorized: false
      role: null
    }

export async function requireDashboardUser(): Promise<DashboardAuthResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user as DashboardUser | null

  if (!user) {
    redirect('/login')
  }

  const adminClient = createAdminClient()

  if (adminClient) {
    const { data } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const role = (data as ProfileRoleRow | null)?.role ?? null
    if (role === 'admin' || role === 'staff') {
      return { user, authorized: true as const, role }
    }
  }

  const allowBootstrap = process.env.ALLOW_ADMIN_EMAIL_BOOTSTRAP === 'true'
  if (allowBootstrap && isAdminEmail(user.email) && adminClient) {
    const { count, error } = await adminClient
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'admin')
    if (!error && (count ?? 0) === 0) {
      return {
        user,
        authorized: true as const,
        role: 'admin' as DashboardRole,
        bootstrap: true as const,
      }
    }
  }

  if (allowBootstrap && isAdminEmail(user.email) && !adminClient) {
    return { user, authorized: true as const, role: 'admin' as DashboardRole, bootstrap: true as const }
  }

  return { user, authorized: false as const, role: null }
}

export async function requireAdminUser() {
  const auth = await requireDashboardUser()
  if (auth.authorized && auth.role === 'admin') {
    return auth
  }
  return { user: auth.user, authorized: false as const, role: auth.role }
}
