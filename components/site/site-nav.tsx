'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronRightIcon } from '@/components/icons'
import { SiteBrandMark } from '@/components/site/site-brand-mark'
import { TransitionLink } from '@/components/site/transition-link'
import { BRAND_DESCRIPTOR } from '@/utils/brand/site-brand'

const CAPABILITY_LINKS = [
  { href: '/capabilities/executive-search', label: 'Executive Search' },
  { href: '/capabilities/leadership-assessment', label: 'Leadership Assessment' },
  { href: '/capabilities/succession-strategy', label: 'Succession Strategy' },
  { href: '/capabilities/ai-readiness', label: 'AI Capability & Enablement' },
]

const FRAMEWORK_LINKS = [
  { href: '/framework/lq8', label: 'LQ8 Leadership' },
  { href: '/framework/lq-ai-readiness', label: 'LQ AI Capability & Enablement' },
]

type NavLink = {
  href: string
  label: string
  children?: Array<{ href: string; label: string }>
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/capabilities', label: 'Capabilities', children: CAPABILITY_LINKS },
  { href: '/framework', label: 'Frameworks', children: FRAMEWORK_LINKS },
  { href: '/about', label: 'About' },
  { href: '/work-with-us', label: 'Work With Us' },
] satisfies NavLink[]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function SiteNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileExpandedSections, setMobileExpandedSections] = useState<Record<string, boolean>>({})
  const isHome = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const lightGlass = isHome && !scrolled && !mobileOpen

  function toggleMobileSection(href: string) {
    setMobileExpandedSections((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  function closeMobileMenu() {
    setMobileOpen(false)
  }

  function renderDesktopLink(link: NavLink) {
    if (!link.children) {
      return (
        <TransitionLink
          key={link.href}
          href={link.href}
          className="font-cta text-[15px] font-medium tracking-[0.02em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
        >
          <span className="relative">
            {link.label}
            {isActive(pathname, link.href) && (
              <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-[var(--site-accent-strong)]" />
            )}
          </span>
        </TransitionLink>
      )
    }

    return (
      <div key={link.href} className="group relative">
        <TransitionLink
          href={link.href}
          className="font-cta text-[15px] font-medium tracking-[0.02em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
        >
          <span className="relative">
            {link.label}
            {isActive(pathname, link.href) && (
              <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-[var(--site-accent-strong)]" />
            )}
          </span>
        </TransitionLink>

        <div className="site-nav-popover invisible absolute right-0 top-9 w-[360px] translate-y-3 rounded-[var(--radius-card)] p-5 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
          <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{link.label}</p>
          <div className="grid grid-cols-1 gap-1">
            {link.children.map((childLink) => (
              <TransitionLink
                key={childLink.href}
                href={childLink.href}
                className="site-glass-tab-v3 font-ui rounded-xl px-3 py-2.5 text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
              >
                {childLink.label}
              </TransitionLink>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          lightGlass
            ? 'border-b border-transparent bg-[var(--site-glass-bg)] backdrop-blur-lg'
            : 'border-b border-[var(--site-border-soft)] bg-[var(--site-glass-bg-strong)] backdrop-blur-xl'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <TransitionLink href="/" className="inline-flex flex-col items-start text-[var(--site-text-primary)]">
            <span className="inline-flex items-center gap-3">
              <SiteBrandMark alt="" priority className="h-[2.15rem] w-auto shrink-0" />
              <span className="font-serif text-2xl leading-none tracking-[-0.01em]">Leadership Quarter</span>
            </span>
            <span className="font-eyebrow mt-1 w-full text-center text-[10px] uppercase tracking-[0.1em] text-[var(--site-text-muted)] sm:text-[11px]">
              {BRAND_DESCRIPTOR}
            </span>
          </TransitionLink>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map(renderDesktopLink)}

            {isHome && (
              <TransitionLink
                href="/client-login"
                className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] bg-[var(--site-glass-bg)] px-4 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-glass-bg-strong)]"
              >
                Client login
              </TransitionLink>
            )}
            <TransitionLink
              href="/work-with-us"
              className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
            >
              Get in touch
            </TransitionLink>
          </div>

          <button
            className="text-[var(--site-text-primary)] md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <span className="font-cta text-sm font-semibold tracking-[0.09em]">{mobileOpen ? 'CLOSE' : 'MENU'}</span>
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[var(--site-bg)]/95 px-6 pb-10 pt-28 backdrop-blur-xl md:hidden">
          <div className="mx-auto max-w-7xl">
            <div className="site-mobile-nav-list">
              {NAV_LINKS.map((link) => {
                const hasChildren = Boolean(link.children?.length)
                const expanded = hasChildren && (mobileExpandedSections[link.href] ?? isActive(pathname, link.href))

                return (
                  <div key={link.href} className="site-mobile-nav-item">
                    <div className="site-mobile-nav-row">
                      <TransitionLink
                        href={link.href}
                        onClick={closeMobileMenu}
                        className={[
                          'site-mobile-nav-link',
                          isActive(pathname, link.href) ? 'site-mobile-nav-link-active' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {link.label}
                      </TransitionLink>

                      {hasChildren ? (
                        <button
                          type="button"
                          className="site-mobile-nav-toggle"
                          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${link.label}`}
                          aria-controls={`mobile-subnav-${link.href.replace(/\W+/g, '-')}`}
                          aria-expanded={expanded}
                          onClick={() => toggleMobileSection(link.href)}
                        >
                          <ChevronRightIcon className={['h-4 w-4 transition-transform duration-200', expanded ? 'rotate-90' : ''].join(' ')} />
                        </button>
                      ) : null}
                    </div>

                    {hasChildren && expanded ? (
                      <div id={`mobile-subnav-${link.href.replace(/\W+/g, '-')}`} className="site-mobile-subnav">
                        {link.children?.map((childLink) => (
                          <TransitionLink
                            key={childLink.href}
                            href={childLink.href}
                            onClick={closeMobileMenu}
                            className={[
                              'site-mobile-subnav-link',
                              isActive(pathname, childLink.href) ? 'site-mobile-subnav-link-active' : '',
                            ].filter(Boolean).join(' ')}
                          >
                            {childLink.label}
                          </TransitionLink>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <TransitionLink
              href="/work-with-us"
              onClick={closeMobileMenu}
              className="font-cta mt-8 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-3 text-sm font-semibold tracking-[0.04em] text-[var(--site-cta-text)]"
            >
              Get in touch
            </TransitionLink>
            {isHome && (
              <TransitionLink
                href="/client-login"
                onClick={closeMobileMenu}
                className="font-cta mt-3 inline-block rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] bg-[var(--site-glass-bg)] px-7 py-3 text-sm font-semibold tracking-[0.04em] text-[var(--site-text-primary)]"
              >
                Client login
              </TransitionLink>
            )}
          </div>
        </div>
      )}
    </>
  )
}
