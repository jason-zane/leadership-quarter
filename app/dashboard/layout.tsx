import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/auth/actions'
import { DashboardNav } from '@/components/dashboard/nav'
import { FoundationPageContainer } from '@/components/ui/foundation/page-container'
import { FoundationButton } from '@/components/ui/foundation/button'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { getPortalBaseUrl } from '@/utils/hosts'
import { resolvePortalContext } from '@/utils/portal-context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await requireDashboardUser()
  const portalBaseUrl = getPortalBaseUrl()

  if (!auth.authorized) {
    const portal = await resolvePortalContext()
    if (portal.context?.source === 'membership') {
      redirect(`${portalBaseUrl}/portal`)
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
            <Link href={`${portalBaseUrl}/portal/login`} className="font-medium underline underline-offset-2">
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
        <aside className="admin-sidebar hidden w-72 shrink-0 flex-col px-4 py-5 md:flex md:mt-6 md:min-h-[calc(100vh-3rem)]">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-soft)]">Leadership Quarter</p>
            <p className="mt-2 font-serif text-2xl text-[var(--admin-text-primary)]">Admin backend</p>
            <p className="mt-2 text-sm text-[var(--admin-text-muted)]">Assessments, campaigns, CRM, and backend operations.</p>
          </div>

          <div className="flex-1">
            <DashboardNav role={auth.role} />
          </div>

          <div className="mt-6 border-t border-[var(--admin-border)] pt-4">
            <p className="mb-2 truncate px-2 text-xs text-[var(--admin-text-muted)]">{auth.user.email}</p>
            <form action={logout}>
              <FoundationButton type="submit" variant="ghost" className="w-full justify-start">
                Log out
              </FoundationButton>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="admin-mobile-bar fixed inset-x-0 top-0 z-30 md:hidden">
            <FoundationPageContainer className="flex h-[60px] items-center justify-between px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-soft)]">Leadership Quarter</p>
                <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Admin backend</p>
              </div>
              <form action={logout}>
                <FoundationButton type="submit" variant="secondary" size="sm">
                  Log out
                </FoundationButton>
              </form>
            </FoundationPageContainer>
          </div>

          <div className="admin-mobile-nav-shell fixed inset-x-0 top-[60px] z-20 md:hidden">
            <FoundationPageContainer className="px-4 py-3">
              <DashboardNav role={auth.role} mode="mobile" />
            </FoundationPageContainer>
          </div>

          <main className="min-w-0 px-4 pb-16 pt-[8.5rem] md:px-6 md:pb-20 md:pt-8">{children}</main>
        </div>
      </FoundationPageContainer>
    </div>
  )
}
