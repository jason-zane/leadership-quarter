import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { requirePortalUser } from '@/utils/portal-auth'
import { PortalOrgSwitcher } from '@/components/portal/org-switcher'
import { getAdminBaseUrl } from '@/utils/hosts'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const auth = await requirePortalUser()
  const adminUrl = getAdminBaseUrl()

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Leadership Quarter Portal</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{auth.organisationSlug}</p>
            </div>
            {auth.isBypassAdmin && (
              <PortalOrgSwitcher currentOrganisationId={auth.organisationId} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {auth.isBypassAdmin && (
              <a
                href={`${adminUrl}/dashboard`}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              >
                Internal Admin
              </a>
            )}
            <form action={logout}>
              <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="space-y-2">
          <Link href="/portal" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900">
            Overview
          </Link>
          <Link href="/portal/campaigns" className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900">
            Campaigns
          </Link>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  )
}
