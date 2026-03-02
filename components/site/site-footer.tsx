import { TransitionLink } from '@/components/site/transition-link'
import { LQMark } from '@/components/site/lq-mark'
import { CONTACT_EMAIL_LABEL, MAILTO_GENERAL } from '@/utils/brand/contact'

const CAPABILITY_LINKS = [
  { href: '/capabilities/executive-search', label: 'Executive Search' },
  { href: '/capabilities/leadership-assessment', label: 'Leadership Assessment' },
  { href: '/capabilities/succession-strategy', label: 'Succession Strategy' },
  { href: '/capabilities/ai-readiness', label: 'AI Readiness' },
]

const FRAMEWORK_LINKS = [
  { href: '/framework', label: 'Our Frameworks' },
  { href: '/framework/lq8', label: 'LQ8 Leadership' },
  { href: '/framework/lq-ai-readiness', label: 'LQ AI Readiness' },
]

export function SiteFooter() {
  return (
    <footer className="pb-10 pt-24" style={{ background: 'var(--site-gradient-soft)' }}>
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="grid grid-cols-1 gap-12 border-t border-[var(--site-border-soft)] pt-12 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4">
              <LQMark />
            </div>
            <p className="font-serif text-4xl leading-[1.02] tracking-[-0.01em] text-[var(--site-text-primary)]">
              Make better
              <br />
              decisions on leadership.
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--site-text-body)]">
              Leadership Quarter partners with organisations to identify, assess, and appoint leaders with confidence.
            </p>
          </div>

          <div>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Capabilities</p>
            <div className="space-y-2">
              {CAPABILITY_LINKS.map((link) => (
                <TransitionLink
                  key={link.href}
                  href={link.href}
                  className="font-cta block text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
                >
                  {link.label}
                </TransitionLink>
              ))}
            </div>
          </div>

          <div>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Our Frameworks</p>
            <div className="space-y-2">
              {FRAMEWORK_LINKS.map((link) => (
                <TransitionLink
                  key={link.href}
                  href={link.href}
                  className="font-cta block text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
                >
                  {link.label}
                </TransitionLink>
              ))}
            </div>
          </div>

          <div>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Contact</p>
            <div className="space-y-2">
              <TransitionLink
                href="/about"
                className="font-cta block text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
              >
                About
              </TransitionLink>
              <TransitionLink
                href="/work-with-us"
                className="font-cta block text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
              >
                Get in touch
              </TransitionLink>
              <TransitionLink
                href="/work-with-us"
                className="font-cta block text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
              >
                Work with us
              </TransitionLink>
              <a
                href={MAILTO_GENERAL}
                className="font-cta block text-sm tracking-[0.01em] text-[var(--site-text-body)] transition-colors hover:text-[var(--site-text-primary)]"
              >
                {CONTACT_EMAIL_LABEL}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--site-border-soft)] pt-4 text-xs text-[var(--site-text-muted)]">
          <span>© {new Date().getFullYear()} Leadership Quarter. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
