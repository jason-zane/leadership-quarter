import { redirect } from 'next/navigation'
import { logout } from '@/app/auth/actions'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { createClient } from '@/utils/supabase/server'
import { DashboardNav } from '@/components/dashboard/nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = await requireDashboardUser()

  if (!auth.authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Miles Between</p>
          <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">{auth.user.email}</p>
          <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            You don&apos;t have access to the admin backend.
            {process.env.ALLOW_ADMIN_EMAIL_BOOTSTRAP !== 'true' && (
              <span className="mt-1 block text-xs text-amber-700 dark:text-amber-400">
                If you&apos;re the first admin, set ALLOW_ADMIN_EMAIL_BOOTSTRAP=true and add your email to ADMIN_DASHBOARD_EMAILS.
              </span>
            )}
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-full border border-zinc-300 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    )
  }

  const enforceTotp = process.env.ENFORCE_ADMIN_TOTP !== 'false'
  if (enforceTotp) {
    const supabase = await createClient()
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const currentLevel = aalData?.currentLevel ?? null

    if (!aalError && currentLevel !== 'aal2') {
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const hasVerifiedTotp = factorsData?.totp?.some((f) => f.status === 'verified') ?? false
      const dest = hasVerifiedTotp ? '/mfa/totp/verify' : '/mfa/totp/enroll'
      redirect(`${dest}?next=/dashboard`)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl">
        {/* Sidebar — desktop only */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-900 md:flex" style={{ minHeight: '100vh' }}>
          <div className="mb-6 px-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Miles Between</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Admin</p>
          </div>

          <div className="flex-1">
            <DashboardNav role={auth.role} />
          </div>

          <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="mb-2 truncate px-2 text-xs text-zinc-500 dark:text-zinc-400">
              {auth.user.email}
            </p>
            <form action={logout}>
              <button
                type="submit"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200"
              >
                Log out
              </button>
            </form>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Miles Between</p>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Log out
            </button>
          </form>
        </div>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 pb-16 pt-20 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}
