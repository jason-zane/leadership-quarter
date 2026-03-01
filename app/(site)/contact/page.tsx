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
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.9rem,7vw,5.6rem)] text-[var(--site-text-primary)]">
              Tell us what your business
              <span className="block text-[var(--site-accent-strong)]">needs from leadership next.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="site-split-cta mx-auto max-w-5xl rounded-[var(--radius-panel)] p-8 md:p-12">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="font-eyebrow text-xs uppercase tracking-[0.22em] text-[var(--site-text-muted)]">Direct contact</p>
                  <h2 className="site-heading-section mt-4 font-serif text-[clamp(2rem,4vw,3.2rem)] text-[var(--site-text-primary)]">
                    Start with context.
                    <span className="block text-[var(--site-accent-strong)]">We will take it from there.</span>
                  </h2>
                  <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">
                    Share your context, leadership goals, and timing. We will respond with a practical point of view on how to find, assess, and build the capability you need.
                  </p>
                </div>
                <div className="flex flex-col justify-end gap-4">
                  <a
                    href={MAILTO_GENERAL}
                    className="font-cta inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
                  >
                    Send your leadership brief
                  </a>
                  <p className="text-sm leading-relaxed text-[var(--site-text-muted)]">
                    Include role scope, timing, and your key leadership outcomes to speed up first response.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
