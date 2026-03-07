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
      <header className="portal-header-shell sticky top-0 z-30">
        <FoundationPageContainer className="px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="portal-brand-meta">Leadership Quarter</p>
              <p className="portal-brand-title">Client portal</p>
              <p className="portal-brand-subtitle">{auth.organisationSlug}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {auth.isBypassAdmin && <PortalOrgSwitcher currentOrganisationId={auth.organisationId} />}
              {auth.isBypassAdmin && (
                <a href={`${adminUrl}/dashboard`} className="portal-action-link">
                  Internal Admin
                </a>
              )}
              <form action={portalLogout}>
                <FoundationButton type="submit" size="sm" variant="secondary">
                  Log out
                </FoundationButton>
              </form>
            </div>
          </div>
          <div className="portal-mobile-nav-shell md:hidden">
            <PortalNavLinks mode="mobile" />
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
