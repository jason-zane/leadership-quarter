import { StructuredData } from '@/components/site/structured-data'
import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'
import { getOrganizationSchema, getWebsiteSchema } from '@/utils/site/structured-data'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-theme-v1 site-page-ambient">
      <StructuredData data={[getOrganizationSchema(), getWebsiteSchema()]} />
      <SiteNav />
      <main className="relative z-10">{children}</main>
      <SiteFooter />
    </div>
  )
}
