'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { TransitionLink } from '@/components/site/transition-link'
import { trackSiteEvent } from '@/utils/analytics'
import { siteButtonClasses, siteTextClasses } from '@/utils/brand/site-brand'
import { CONTACT_EMAIL_LABEL, MAILTO_GENERAL } from '@/utils/brand/contact'

const NAV_LINKS = [
  { href: '/retreats', label: 'Retreats' },
  { href: '/experience', label: 'Experience' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const dark = scrolled || mobileOpen
  const isRetreatDetail = pathname.startsWith('/retreats/')
  const primaryCtaHref = isRetreatDetail ? '#register' : '/#register'
  const primaryCtaLabel = isRetreatDetail ? 'Apply for This Retreat' : 'Join Retreat List'
  const PrimaryLink = primaryCtaHref.includes('#') ? Link : TransitionLink

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          dark ? 'bg-[color:var(--site-accent-strong)]/95 shadow-sm backdrop-blur-md' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
          <TransitionLink
            href="/"
            className={`font-serif text-xl font-bold tracking-tight transition-colors duration-500 ${
              dark ? 'text-[var(--site-on-dark-primary)]' : 'text-white'
            }`}
          >
            MILES // BETWEEN
          </TransitionLink>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <TransitionLink
                key={link.href}
                href={link.href}
                className={`relative transition-colors duration-300 ${siteTextClasses.nav} ${
                  dark
                    ? 'text-[var(--site-on-dark-muted)] hover:text-[var(--site-on-dark-primary)]'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {link.label}
                {isActive(pathname, link.href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-current"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </TransitionLink>
            ))}
            <PrimaryLink
              href={primaryCtaHref}
              onClick={() =>
                trackSiteEvent('cta_clicked', {
                  cta_id: 'site_nav_primary',
                  page_type: isRetreatDetail ? 'retreat' : 'site',
                })
              }
              className={`rounded-full border px-5 py-2.5 text-sm transition-all duration-300 ${
                dark
                  ? siteButtonClasses.outlineDark
                  : 'border-white/80 text-white hover:bg-[var(--site-surface-elevated)] hover:text-[var(--site-text-primary)]'
              }`}
            >
              {primaryCtaLabel}
            </PrimaryLink>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className={`relative z-[110] flex h-10 w-10 items-center justify-center transition-colors md:hidden ${
              mobileOpen
                ? 'text-[var(--site-on-dark-primary)]'
                : dark
                  ? 'text-[var(--site-on-dark-primary)]'
                  : 'text-white'
            }`}
          >
            <motion.span
              animate={{ rotate: mobileOpen ? 45 : 0, y: mobileOpen ? 6 : 0 }}
              transition={{ duration: 0.25 }}
              className="absolute block h-0.5 w-6 rounded-full bg-current"
              style={{ top: '14px' }}
            />
            <motion.span
              animate={{ opacity: mobileOpen ? 0 : 1 }}
              transition={{ duration: 0.15 }}
              className="absolute block h-0.5 w-6 rounded-full bg-current"
              style={{ top: '19px' }}
            />
            <motion.span
              animate={{ rotate: mobileOpen ? -45 : 0, y: mobileOpen ? -6 : 0 }}
              transition={{ duration: 0.25 }}
              className="absolute block h-0.5 w-6 rounded-full bg-current"
              style={{ top: '24px' }}
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex flex-col bg-[var(--site-accent-strong)] px-8 md:hidden"
          >
            <div className="flex flex-1 flex-col justify-center gap-2 pt-20">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.3, delay: i * 0.07 }}
                >
                  <TransitionLink
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block py-3 font-ui text-2xl font-medium tracking-[0.02em] transition-colors ${
                      isActive(pathname, link.href)
                        ? 'text-[var(--site-on-dark-primary)]'
                        : 'text-[var(--site-text-secondary)] hover:text-[var(--site-on-dark-primary)]'
                    }`}
                  >
                    {link.label}
                  </TransitionLink>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, delay: NAV_LINKS.length * 0.07 }}
                className="mt-8"
              >
                <PrimaryLink
                  href={primaryCtaHref}
                  onClick={() => {
                    setMobileOpen(false)
                    trackSiteEvent('cta_clicked', {
                      cta_id: 'site_nav_mobile_primary',
                      page_type: isRetreatDetail ? 'retreat' : 'site',
                    })
                  }}
                  className={`inline-block rounded-full px-7 py-3.5 text-sm font-medium transition-colors ${siteButtonClasses.outlineDark}`}
                >
                  {primaryCtaLabel}
                </PrimaryLink>
              </motion.div>
            </div>

            <div className="pb-12">
              <a
                href={MAILTO_GENERAL}
                className="font-ui block text-sm tracking-[0.02em] text-[var(--site-text-secondary)] transition-colors hover:text-[var(--site-on-dark-primary)]"
              >
                {CONTACT_EMAIL_LABEL}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
