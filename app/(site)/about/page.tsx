import Image from 'next/image'
import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { MAILTO_GENERAL } from '@/utils/brand/contact'
import { brandImagery } from '@/utils/brand/imagery'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn how Leadership Quarter helps organisations make better leadership decisions through capability-first search, assessment, and talent strategy.',
}

export default function AboutPage() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-24 pt-40 md:pb-32 md:pt-52" style={{ background: 'var(--site-gradient-stage)' }}>
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.3em] text-[var(--site-text-secondary)]">About Leadership Quarter</p>
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.9rem,7vw,5.6rem)] text-[var(--site-text-primary)]">
              We back leadership decisions
              <span className="block text-[var(--site-accent-strong)]">with capability evidence.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-12">
          <Reveal>
            <div>
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">Who we are</p>
              <p className="text-lg leading-relaxed text-[var(--site-text-body)]">
                Leadership Quarter is a specialist consulting partner for boards and executive teams making high-stakes leadership decisions.
              </p>
              <p className="mt-6 text-lg leading-relaxed text-[var(--site-text-body)]">
                Our work is industry and role agnostic. We value experience, but we prioritise core capability, agility, and drive in leaders.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="site-glass-card-strong relative overflow-hidden rounded-[var(--radius-panel)]">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={brandImagery.about.mission.src}
                  alt={brandImagery.about.mission.alt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-8 text-xs uppercase tracking-[0.22em] text-[var(--site-text-muted)]">How we build outcomes</p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-fr">
            {[
              {
                title: 'Define what good looks like',
                body: 'We set clear capability criteria for the role, the team, and the stage of business.',
              },
              {
                title: 'Assess for real delivery',
                body: 'We evaluate leaders for judgement, adaptability, and the drive to execute through uncertainty.',
              },
              {
                title: 'Build for sustained performance',
                body: 'We align search, succession, and talent strategy so leadership capability compounds over time.',
              },
            ].map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <div
                  className={`h-full rounded-[var(--radius-card)] p-7 ${
                    index === 1 ? 'bg-[var(--site-blueprint-tint)] shadow-[var(--shadow-soft)]' : 'site-glass-card'
                  }`}
                >
                  <h2 className="font-serif text-2xl leading-[1.12] tracking-[-0.006em] text-[var(--site-text-primary)]">{item.title}</h2>
                  <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="site-split-cta rounded-[var(--radius-panel)] p-8 md:p-12">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
                <div>
                  <p className="font-eyebrow text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">Next step</p>
                  <h2 className="site-heading-section mt-4 max-w-3xl font-serif text-[clamp(2rem,4vw,3.4rem)] text-[var(--site-text-primary)]">
                    Need a clearer view of leadership capability?
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">
                    Share the role, transition, or capability gap you are solving. We will respond with a practical starting point.
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:items-start md:justify-end">
                  <TransitionLink
                    href="/contact"
                    className="font-cta inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
                  >
                    Talk to Leadership Quarter
                  </TransitionLink>
                  <a
                    href={MAILTO_GENERAL}
                    className="font-cta inline-block rounded-[var(--radius-pill)] border border-[var(--site-border)] px-7 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-elevated)]"
                  >
                    Email us directly
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
