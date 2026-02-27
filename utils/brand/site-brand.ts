import type { BrandCtaVariant } from '@/utils/brand/brand-guidelines'

export const siteButtonClasses = {
  primary:
    'font-ui tracking-[0.02em] bg-[var(--site-cta-bg)] text-[var(--site-cta-text)] hover:bg-[var(--site-cta-hover-bg)]',
  secondary:
    'font-ui tracking-[0.02em] bg-[var(--site-accent-strong)] text-[var(--site-on-dark-primary)] hover:bg-[var(--site-accent-deep)]',
  ghost: 'font-ui tracking-[0.02em] bg-transparent text-[var(--site-text-primary)] hover:bg-[var(--site-surface-soft)]',
  outlineLight:
    'font-ui tracking-[0.02em] border border-[var(--site-accent-strong)] text-[var(--site-accent-strong)] hover:bg-[var(--site-accent-strong)] hover:text-[var(--site-on-dark-primary)]',
  outlineDark:
    'font-ui tracking-[0.02em] border border-[color:var(--site-on-dark-primary)]/70 text-[var(--site-on-dark-primary)] hover:bg-[var(--site-on-dark-primary)] hover:text-[var(--site-cta-bg)]',
  outlineAccent:
    'font-ui tracking-[0.02em] border border-[var(--site-cta-bg)] text-[var(--site-cta-bg)] hover:bg-[var(--site-cta-bg)] hover:text-[var(--site-cta-text)]',
} as const

export function getCtaButtonClass(variant: BrandCtaVariant) {
  return siteButtonClasses[variant]
}

export const siteTextClasses = {
  onDarkPrimary: 'text-[var(--site-on-dark-primary)]',
  onDarkMuted: 'text-[var(--site-on-dark-muted)]',
  body: 'text-[var(--site-text-body)]',
  heading: 'text-[var(--site-text-primary)]',
  muted: 'text-[var(--site-text-muted)]',
  eyebrow: 'font-ui text-[13px] font-medium uppercase tracking-[0.15em]',
  nav: 'font-ui text-[15px] font-medium tracking-[0.02em]',
  meta: 'font-ui text-[14px] font-medium',
} as const
