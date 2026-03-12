import Link from 'next/link'
import { Suspense } from 'react'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CopyEmail } from '@/components/ui/copy-email'
import { RelativeTime } from '@/components/ui/relative-time'
import { ActionFeedback } from '@/components/ui/action-feedback'
import { InviteUserDialog } from '@/components/dashboard/users/invite-user-dialog'
import { UserRowActions } from '@/components/dashboard/users/user-row-actions'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type ProfileRow = {
  user_id: string
  role: 'admin' | 'staff'
}

type OrgMembershipRow = {
  user_id: string
  role: string
  status: string
  organisations: { id: string; name: string } | null
}

type AuthUser = {
  id: string
  email?: string | null
  created_at?: string
  last_sign_in_at?: string | null
}

type PortalMember = {
  orgId: string
  orgName: string
  portalRole: string
}

const feedbackMessages: Record<string, string> = {
  '1': 'Role updated.',
  invited_set_sent: 'Invite sent — they will receive an email to set their password.',
  password_reset_sent: 'Password reset email sent.',
  removed: 'User removed.',
  role_only: 'User already exists — role updated.',
}

const errorFeedbackMessages: Record<string, string> = {
  site_url_not_configured:
    'Production URL is missing. Set NEXT_PUBLIC_SITE_URL in Vercel production env vars.',
  invite_redirect_not_allowed:
    'Supabase blocked invite redirect URL. Add the public /set-password URL in Supabase Auth URL configuration.',
  invite_email_provider_failed:
    'Supabase invite email failed. Check SMTP/provider configuration.',
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const activeTab = params.tab === 'portal' ? 'portal' : 'backend'

  const auth = await requireDashboardUser()
  if (!auth.authorized) {
    return null
  }
  if (auth.role !== 'admin') {
    return (
      <DashboardPageShell>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Users</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          User management is restricted to admin accounts.
        </p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          Your account can use the rest of the backend, but only admins can invite users, change
          roles, send password resets, or remove accounts.
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Back to Overview
          </Link>
        </div>
      </DashboardPageShell>
    )
  }

  const adminClient = createAdminClient()
  const supabase = await createClient()
  let users: AuthUser[] = []
  let rolesByUserId = new Map<string, 'admin' | 'staff'>()
  const portalMembersByUserId = new Map<string, PortalMember>()
  let loadError: string | null = null

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!adminClient) {
    loadError = 'Missing SUPABASE_SERVICE_ROLE_KEY in environment.'
  } else {
    const [
      { data: usersResult, error: usersError },
      { data: profiles, error: profilesError },
      { data: memberships, error: membershipsError },
    ] = await Promise.all([
      adminClient.auth.admin.listUsers(),
      adminClient.from('profiles').select('user_id, role'),
      adminClient
        .from('organisation_memberships')
        .select('user_id, role, status, organisations(id, name)')
        .in('status', ['invited', 'active']),
    ])

    if (usersError) {
      loadError = usersError.message
    } else if (profilesError) {
      loadError = profilesError.message
    } else if (membershipsError) {
      loadError = membershipsError.message
    } else {
      users = (usersResult.users ?? []) as AuthUser[]
      rolesByUserId = new Map(
        ((profiles ?? []) as ProfileRow[]).map((p) => [p.user_id, p.role])
      )
      for (const m of (memberships ?? []) as unknown as OrgMembershipRow[]) {
        if (m.organisations) {
          portalMembersByUserId.set(m.user_id, {
            orgId: m.organisations.id,
            orgName: m.organisations.name,
            portalRole: m.role,
          })
        }
      }
    }
  }

  const backendUsers = users.filter(
    (u) => rolesByUserId.has(u.id) || !portalMembersByUserId.has(u.id)
  )
  const portalUsers = users.filter((u) => portalMembersByUserId.has(u.id))

  const visibleUsers = activeTab === 'portal' ? portalUsers : backendUsers

  return (
    <DashboardPageShell>
      <Suspense>
        <ActionFeedback messages={feedbackMessages} errorMessages={errorFeedbackMessages} />
      </Suspense>

      <DashboardPageHeader
        title="Users"
        description="Manage backend access, roles, and authentication."
        actions={activeTab === 'backend' ? <InviteUserDialog /> : undefined}
      />

      {/* Tab strip */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          href="/dashboard/users?tab=backend"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'backend'
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Backend users
          <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {backendUsers.length}
          </span>
        </Link>
        <Link
          href="/dashboard/users?tab=portal"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'portal'
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          Portal clients
          <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {portalUsers.length}
          </span>
        </Link>
      </div>

      {loadError ? (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Could not load users: {loadError}
        </p>
      ) : null}

      <DashboardDataTableShell>
        {activeTab === 'backend' ? (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Role
                </th>
                <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:table-cell">
                  Last active
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No backend users yet. Invite the first user to get started.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => {
                  const internalRole = rolesByUserId.get(user.id)
                  const role: 'admin' | 'staff' = internalRole ?? 'staff'
                  const displayRole = internalRole ?? 'no access'
                  const isSelf = user.id === currentUser?.id
                  const displayEmail = user.email ?? 'Unknown'

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={displayEmail} />
                          <div className="min-w-0">
                            <CopyEmail email={displayEmail} />
                            {isSelf && (
                              <p className="text-xs text-zinc-400 dark:text-zinc-500">You</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={internalRole ?? 'closed'}>{displayRole}</Badge>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {user.last_sign_in_at ? (
                            <RelativeTime date={user.last_sign_in_at} />
                          ) : (
                            'Never'
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserRowActions
                          userId={user.id}
                          email={user.email ?? ''}
                          currentRole={role}
                          isSelf={isSelf}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Organisation
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Portal role
                </th>
                <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:table-cell">
                  Last active
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No portal client users found.
                  </td>
                </tr>
              ) : (
                visibleUsers.map((user) => {
                  const membership = portalMembersByUserId.get(user.id)
                  const displayEmail = user.email ?? 'Unknown'
                  const portalRoleLabel = (membership?.portalRole ?? '').replace(/_/g, ' ')

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={displayEmail} />
                          <div className="min-w-0">
                            <CopyEmail email={displayEmail} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {membership ? (
                          <Link
                            href={`/dashboard/clients/${membership.orgId}`}
                            className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                          >
                            {membership.orgName}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="staff">{portalRoleLabel}</Badge>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {user.last_sign_in_at ? (
                            <RelativeTime date={user.last_sign_in_at} />
                          ) : (
                            'Never'
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/clients/${membership?.orgId}`}
                          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          View org
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
