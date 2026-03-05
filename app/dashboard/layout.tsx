import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/auth/actions'
import { DashboardNav } from '@/components/dashboard/nav'
import { FoundationPageContainer } from '@/components/ui/foundation/page-container'
import { FoundationButton } from '@/components/ui/foundation/button'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { resolvePortalContext } from '@/utils/portal-context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await requireDashboardUser()

  if (!auth.authorized) {
    const portal = await resolvePortalContext()
    if (portal.context?.source === 'membership') {
      redirect('/portal')
    }

    return (
      <div className="admin-shell flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="mb-1 text-sm font-semibold text-zinc-900">Leadership Quarter</p>
          <p className="mb-5 text-sm text-zinc-500">{auth.user.email}</p>
          <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            You don&apos;t have access to the admin backend.
            {process.env.ALLOW_ADMIN_EMAIL_BOOTSTRAP !== 'true' && (
              <span className="mt-1 block text-xs text-amber-700">
                If you&apos;re the first admin, set ALLOW_ADMIN_EMAIL_BOOTSTRAP=true and add your email to ADMIN_DASHBOARD_EMAILS.
              </span>
            )}
          </p>
          <p className="mb-5 text-sm text-zinc-600">
            If this is a client account, use the client portal instead.{' '}
            <Link href="/portal/login" className="font-medium underline underline-offset-2">
              Go to portal login
            </Link>
          </p>
          <form action={logout}>
            <FoundationButton type="submit" variant="secondary" className="w-full">
              Log out
            </FoundationButton>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <FoundationPageContainer className="flex w-full">
        <aside className="admin-sidebar hidden w-60 shrink-0 flex-col px-4 py-6 md:flex" style={{ minHeight: '100vh' }}>
          <div className="mb-6 px-2">
            <p className="text-sm font-semibold text-zinc-900">Leadership Quarter</p>
            <p className="text-xs text-zinc-500">Admin</p>
          </div>

          <div className="flex-1">
            <DashboardNav role={auth.role} />
          </div>

          <div className="mt-6 border-t border-zinc-200 pt-4">
            <p className="mb-2 truncate px-2 text-xs text-zinc-500">{auth.user.email}</p>
            <form action={logout}>
              <FoundationButton type="submit" variant="ghost" className="w-full justify-start">
                Log out
              </FoundationButton>
            </form>
          </div>
        </aside>

        <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
          <p className="text-sm font-semibold text-zinc-900">Leadership Quarter Admin</p>
          <form action={logout}>
            <FoundationButton type="submit" variant="secondary" size="sm">
              Log out
            </FoundationButton>
          </form>
        </div>

        <main className="min-w-0 flex-1 px-4 pb-16 pt-20 md:px-6 md:pt-8">{children}</main>
      </FoundationPageContainer>
    </div>
  )
}
