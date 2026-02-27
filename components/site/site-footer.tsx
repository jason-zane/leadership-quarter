'use client'

import Link from 'next/link'
import { siteButtonClasses, siteTextClasses } from '@/utils/brand/site-brand'
import { CONTACT_EMAIL_LABEL, MAILTO_GENERAL } from '@/utils/brand/contact'
import { TransitionLink } from '@/components/site/transition-link'

export function SiteFooter() {
  return (
    <footer className="bg-[var(--site-accent-strong)] py-16">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <p className="mb-3 font-serif text-2xl font-bold text-[var(--site-on-dark-primary)]">MILES // BETWEEN</p>
            <p className="text-sm leading-relaxed text-[var(--site-text-secondary)]">
              Running retreats for people who love running.
            </p>
          </div>

          <div>
            <p className={`mb-4 text-[var(--site-text-secondary)] ${siteTextClasses.eyebrow}`}>
              Explore
            </p>
            <nav className="flex flex-col gap-3">
              {[
                { href: '/retreats', label: 'Retreats' },
                { href: '/experience', label: 'The Experience' },
                { href: '/about', label: 'About' },
                { href: '/faq', label: 'FAQ' },
                { href: '/terms-and-conditions', label: 'Terms' },
              ].map((link) => (
                <TransitionLink
                  key={link.href}
                  href={link.href}
                  className="font-ui text-sm tracking-[0.02em] text-[var(--site-on-dark-muted)] transition-colors hover:text-[var(--site-on-dark-primary)]"
                >
                  {link.label}
                </TransitionLink>
              ))}
            </nav>
          </div>

          <div>
            <p className={`mb-4 text-[var(--site-text-secondary)] ${siteTextClasses.eyebrow}`}>
              Get in touch
            </p>
            <a
              href={MAILTO_GENERAL}
              className="font-ui text-sm tracking-[0.02em] text-[var(--site-on-dark-muted)] transition-colors hover:text-[var(--site-on-dark-primary)]"
            >
              {CONTACT_EMAIL_LABEL}
            </a>
            <div className="mt-4">
              <Link
                href="/#register"
                className={`inline-block px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${siteButtonClasses.outlineDark}`}
              >
                Join Retreat List
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[color:var(--site-on-dark-primary)]/10 pt-8 text-center">
          <p className="text-xs text-[var(--site-text-secondary)]">
            © {new Date().getFullYear()} MILES // BETWEEN. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
