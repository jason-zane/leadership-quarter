import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { MAILTO_GENERAL } from '@/utils/brand/contact'

export const metadata: Metadata = {
  title: 'Get in Touch',
  description:
    'Contact Leadership Quarter to discuss capability-first executive search, assessment, and talent strategy.',
}

export default function ContactPage() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-24 pt-40 md:pb-32 md:pt-52" style={{ background: 'var(--site-gradient-stage)' }}>
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.3em] text-[var(--site-text-secondary)]">Get in touch</p>
            <h1 className="max-w-4xl font-serif text-[clamp(3rem,7vw,5.8rem)] leading-[0.92] text-[var(--site-text-primary)]">
              Tell us what your business
              <span className="block text-[var(--site-accent-strong)]">needs from leadership next.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mx-auto max-w-4xl rounded-[var(--radius-panel)] border border-[var(--site-border-soft)] p-8 shadow-[var(--shadow-soft)] md:p-12" style={{ background: 'var(--site-gradient-soft)' }}>
              <p className="font-eyebrow text-xs uppercase tracking-[0.22em] text-[var(--site-text-muted)]">Direct contact</p>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">
                Share your context, leadership goals, and timing. We will respond with a practical point of view on how to find, assess, and build the capability you need.
              </p>
              <a
                href={MAILTO_GENERAL}
                className="font-cta mt-8 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
              >
                Send your leadership brief
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
