'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TransitionLink } from '@/components/site/transition-link'
import { CONTACT_EMAIL_LABEL, MAILTO_GENERAL } from '@/utils/brand/contact'

const CAPABILITY_LINKS = [
  { href: '/capabilities/executive-search', label: 'Executive Search' },
  { href: '/capabilities/talent-consulting', label: 'Talent Consulting' },
  { href: '/capabilities/executive-assessment', label: 'Executive Assessment' },
  { href: '/capabilities/succession-planning', label: 'Succession Planning' },
  { href: '/capabilities/talent-strategy', label: 'Talent Strategy' },
]

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/capabilities', label: 'Capabilities' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function SiteNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const lightGlass = pathname === '/' && !scrolled && !mobileOpen

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
          <TransitionLink href="/" className="font-serif text-2xl tracking-[-0.01em] text-[var(--site-text-primary)]">
            Leadership Quarter
          </TransitionLink>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              if (link.href === '/capabilities') {
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

                    <div className="site-glass-card-strong invisible absolute right-0 top-9 w-[360px] translate-y-3 rounded-[var(--radius-card)] p-5 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Capabilities</p>
                      <div className="grid grid-cols-1 gap-1">
                        {CAPABILITY_LINKS.map((capability) => (
                          <TransitionLink
                            key={capability.href}
                            href={capability.href}
                            className="site-glass-tab-v3 font-ui rounded-xl px-3 py-2.5 text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
                          >
                            {capability.label}
                          </TransitionLink>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              }

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
            })}

            <a
              href={MAILTO_GENERAL}
              className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-5 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
            >
              Speak with us
            </a>
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
            <div className="space-y-3">
              {NAV_LINKS.map((link) => (
                <TransitionLink
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block border-b border-[var(--site-border-soft)] pb-3 font-serif text-4xl text-[var(--site-text-primary)]"
                >
                  {link.label}
                </TransitionLink>
              ))}
            </div>

            <div className="site-glass-card-strong mt-8 rounded-[var(--radius-card)] p-5">
              <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Capabilities</p>
              {CAPABILITY_LINKS.map((capability) => (
                <TransitionLink
                  key={capability.href}
                  href={capability.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-cta block py-2 text-base tracking-[0.01em] text-[var(--site-text-body)]"
                >
                  {capability.label}
                </TransitionLink>
              ))}
            </div>

            <a
              href={MAILTO_GENERAL}
              className="font-cta mt-8 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-3 text-sm font-semibold tracking-[0.04em] text-[var(--site-cta-text)]"
            >
              {CONTACT_EMAIL_LABEL}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
