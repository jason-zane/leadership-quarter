import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-theme-v1">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
