import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { MAILTO_GENERAL } from '@/utils/brand/contact'

export const metadata: Metadata = {
  title: 'Get in Touch',
  description:
    'Contact Leadership Quarter to discuss capability-first executive search, assessment, and talent strategy.',
}

export default function ContactPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-24 pt-40 md:pb-32 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Get in touch</p>
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
            <div className="mx-auto max-w-6xl">
              <ImmersiveCtaBand
                eyebrow="Direct contact"
                title="Start with context. We will take it from there."
                description="Share your leadership goals, timing, and constraints. We will reply with a clear first recommendation."
                primaryHref={MAILTO_GENERAL}
                primaryLabel="Send your leadership brief"
                secondaryHref="/about"
                secondaryLabel="See how we build outcomes"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
