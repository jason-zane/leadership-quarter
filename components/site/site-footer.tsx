import { TransitionLink } from '@/components/site/transition-link'
import { CONTACT_EMAIL_LABEL, MAILTO_GENERAL } from '@/utils/brand/contact'

const CAPABILITY_LINKS = [
  { href: '/capabilities/executive-search', label: 'Executive Search' },
  { href: '/capabilities/talent-consulting', label: 'Talent Consulting' },
  { href: '/capabilities/executive-assessment', label: 'Executive Assessment' },
  { href: '/capabilities/succession-planning', label: 'Succession Planning' },
  { href: '/capabilities/talent-strategy', label: 'Talent Strategy' },
]

export function SiteFooter() {
  return (
    <footer className="bg-[var(--site-surface)] pb-10 pt-24">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid grid-cols-1 gap-12 border-t border-[var(--site-border-soft)] pt-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="font-serif text-4xl leading-[1.05] text-[var(--site-text-primary)]">
              Build better
              <br />
              leadership systems.
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--site-text-body)]">
              Leadership Quarter partners with organisations to build teams, leaders, and structures that scale.
            </p>
          </div>

          <div>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.22em] text-[var(--site-text-muted)]">Capabilities</p>
            <div className="space-y-2">
              {CAPABILITY_LINKS.map((link) => (
                <TransitionLink
                  key={link.href}
                  href={link.href}
                  className="font-cta block text-sm text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
                >
                  {link.label}
                </TransitionLink>
              ))}
            </div>
          </div>

          <div>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.22em] text-[var(--site-text-muted)]">Contact</p>
            <div className="space-y-2">
              <TransitionLink
                href="/about"
                className="font-cta block text-sm text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
              >
                About
              </TransitionLink>
              <TransitionLink
                href="/contact"
                className="font-cta block text-sm text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
              >
                Contact
              </TransitionLink>
              <a
                href={MAILTO_GENERAL}
                className="font-cta block text-sm text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
              >
                {CONTACT_EMAIL_LABEL}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--site-border-soft)] pt-4 text-xs text-[var(--site-text-muted)] md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} Leadership Quarter. All rights reserved.</span>
          <span>Executive search, talent consulting, and organisational design.</span>
        </div>
      </div>
    </footer>
  )
}
