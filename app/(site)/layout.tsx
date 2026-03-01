import { SiteNav } from '@/components/site/site-nav'
import { SiteFooter } from '@/components/site/site-footer'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-theme-v1 site-page-ambient">
      <SiteNav />
      <main className="relative z-10">{children}</main>
      <SiteFooter />
    </div>
  )
}
