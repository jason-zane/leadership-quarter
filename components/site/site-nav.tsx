'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { TransitionLink } from '@/components/site/transition-link'
import { LQMark } from '@/components/site/lq-mark'
import { BRAND_DESCRIPTOR } from '@/utils/brand/site-brand'

const CAPABILITY_LINKS = [
  { href: '/capabilities/executive-search', label: 'Executive Search' },
  { href: '/capabilities/leadership-assessment', label: 'Leadership Assessment' },
  { href: '/capabilities/succession-strategy', label: 'Succession Strategy' },
  { href: '/capabilities/ai-readiness', label: 'AI Readiness' },
]

const FRAMEWORK_LINKS = [
  { href: '/framework/lq8', label: 'LQ8 Leadership' },
  { href: '/framework/lq-ai-readiness', label: 'LQ AI Readiness' },
]

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/capabilities', label: 'Capabilities' },
  { href: '/framework', label: 'Our Frameworks' },
  { href: '/about', label: 'About' },
  { href: '/work-with-us', label: 'Work With Us' },
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
          <TransitionLink href="/" className="inline-flex flex-col items-start text-[var(--site-text-primary)]">
            <span className="inline-flex items-center gap-3">
              <LQMark className="shrink-0" />
              <span className="font-serif text-2xl leading-none tracking-[-0.01em]">Leadership Quarter</span>
            </span>
            <span className="font-eyebrow mt-1 w-full text-center text-[10px] uppercase tracking-[0.1em] text-[var(--site-text-muted)] sm:text-[11px]">
              {BRAND_DESCRIPTOR}
            </span>
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

                    <div className="site-nav-popover invisible absolute right-0 top-9 w-[360px] translate-y-3 rounded-[var(--radius-card)] p-5 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
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
              if (link.href === '/framework') {
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
                      <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Our Frameworks</p>
                      <div className="grid grid-cols-1 gap-1">
                        {FRAMEWORK_LINKS.map((framework) => (
                          <TransitionLink
                            key={framework.href}
                            href={framework.href}
                            className="site-glass-tab-v3 font-ui rounded-xl px-3 py-2.5 text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
                          >
                            {framework.label}
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

            <div className="site-glass-card-strong mt-4 rounded-[var(--radius-card)] p-5">
              <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Our Frameworks</p>
              {FRAMEWORK_LINKS.map((framework) => (
                <TransitionLink
                  key={framework.href}
                  href={framework.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-cta block py-2 text-base tracking-[0.01em] text-[var(--site-text-body)]"
                >
                  {framework.label}
                </TransitionLink>
              ))}
            </div>

            <TransitionLink
              href="/work-with-us"
              onClick={() => setMobileOpen(false)}
              className="font-cta mt-8 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-3 text-sm font-semibold tracking-[0.04em] text-[var(--site-cta-text)]"
            >
              Get in touch
            </TransitionLink>
          </div>
        </div>
      )}
    </>
  )
}
