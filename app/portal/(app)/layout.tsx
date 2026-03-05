import { portalLogout } from '@/app/auth/actions'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationPageContainer } from '@/components/ui/foundation/page-container'
import { PortalNavLinks } from '@/components/portal/nav-links'
import { PortalOrgSwitcher } from '@/components/portal/org-switcher'
import { getAdminBaseUrl } from '@/utils/hosts'
import { requirePortalUser } from '@/utils/portal-auth'

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requirePortalUser()
  const adminUrl = getAdminBaseUrl()

  return (
    <div className="portal-shell">
      <header className="border-b border-[var(--portal-border)] bg-[var(--portal-surface)]">
        <FoundationPageContainer className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--portal-text-primary)]">Leadership Quarter Portal</p>
              <p className="text-xs text-[var(--portal-text-muted)]">{auth.organisationSlug}</p>
            </div>
            {auth.isBypassAdmin && <PortalOrgSwitcher currentOrganisationId={auth.organisationId} />}
          </div>
          <div className="flex items-center gap-2">
            {auth.isBypassAdmin && (
              <a href={`${adminUrl}/dashboard`} className="portal-nav-link border border-[var(--portal-border)]">
                Internal Admin
              </a>
            )}
            <form action={portalLogout}>
              <FoundationButton type="submit" size="sm" variant="secondary">
                Log out
              </FoundationButton>
            </form>
          </div>
        </FoundationPageContainer>
      </header>

      <FoundationPageContainer className="grid w-full grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="portal-sidebar space-y-1">
          <PortalNavLinks />
        </aside>
        <main>{children}</main>
      </FoundationPageContainer>
    </div>
  )
}
