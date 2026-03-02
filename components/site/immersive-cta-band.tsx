import Link from 'next/link'

type ImmersiveCtaBandProps = {
  eyebrow: string
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  secondaryStyle?: 'subtle-link' | 'button'
}

export function ImmersiveCtaBand({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  secondaryStyle = 'subtle-link',
}: ImmersiveCtaBandProps) {
  const isExternal = (href: string) => href.startsWith('mailto:') || href.startsWith('http')
  const buttonBaseClass =
    'font-ui inline-block rounded-[var(--radius-pill)] px-8 py-3.5 text-sm font-semibold tracking-[0.015em] transition-colors'

  return (
    <div className="site-cta-band rounded-[var(--radius-panel)] px-8 py-10 md:px-12 md:py-14">
      <div className="relative">
        <div>
          <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{eyebrow}</p>
          <h2 className="site-heading-section mt-4 max-w-3xl font-serif text-[clamp(2rem,4.4vw,3.7rem)] text-[var(--site-text-primary)]">
            {title}
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">{description}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {isExternal(primaryHref) ? (
            <a
              href={primaryHref}
              className={`${buttonBaseClass} bg-[var(--site-primary)] text-[var(--site-cta-text)] hover:bg-[var(--site-primary-hover)]`}
            >
              {primaryLabel}
            </a>
          ) : (
            <Link
              href={primaryHref}
              className={`${buttonBaseClass} bg-[var(--site-primary)] text-[var(--site-cta-text)] hover:bg-[var(--site-primary-hover)]`}
            >
              {primaryLabel}
            </Link>
          )}

          {secondaryHref && secondaryLabel ? (
            isExternal(secondaryHref) ? (
              <a
                href={secondaryHref}
                className={
                  secondaryStyle === 'button'
                    ? `${buttonBaseClass} site-card-sub text-[var(--site-text-primary)]`
                    : 'font-ui self-center text-sm font-semibold tracking-[0.01em] text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4 transition-colors hover:text-[var(--site-link-hover)]'
                }
              >
                {secondaryLabel}
              </a>
            ) : (
              <Link
                href={secondaryHref}
                className={
                  secondaryStyle === 'button'
                    ? `${buttonBaseClass} site-card-sub text-[var(--site-text-primary)]`
                    : 'font-ui self-center text-sm font-semibold tracking-[0.01em] text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4 transition-colors hover:text-[var(--site-link-hover)]'
                }
              >
                {secondaryLabel}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}
