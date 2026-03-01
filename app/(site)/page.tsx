import Image from 'next/image'
import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { LogoRail } from '@/components/site/logo-rail'
import { MAILTO_GENERAL } from '@/utils/brand/contact'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesContent } from '@/utils/brand/services-content'

export const metadata: Metadata = {
  title: 'Leadership Consulting and Executive Talent',
  description:
    'Leadership Quarter helps organisations find, assess, and build leaders with the capability, agility, and drive to deliver across industries and roles.',
}

export default function HomePage() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-24 pt-40 md:pb-30 md:pt-52" style={{ background: 'var(--site-gradient-stage)' }}>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.25))]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.1fr_0.9fr] md:items-end md:px-12">
          <div>
            <Reveal>
              <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.3em] text-[var(--site-text-secondary)]">Leadership Quarter</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="max-w-4xl font-serif text-[clamp(3rem,8vw,6.2rem)] leading-[0.9] text-[var(--site-text-primary)]">
                Find leaders with
                <span className="block text-[var(--site-accent-strong)]">the capability to build</span>
                what is next.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">
                We help boards and executive teams find, assess, and build leadership capability. We value experience, but we decide for judgement, agility, and drive.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-10 flex flex-wrap gap-4">
                <TransitionLink
                  href="/capabilities"
                  className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3.5 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
                >
                  Explore capabilities
                </TransitionLink>
                <a
                  href={MAILTO_GENERAL}
                  className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] px-8 py-3.5 text-sm font-semibold tracking-[0.03em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-elevated)]"
                >
                  Start your leadership brief
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} y={26}>
            <div className="relative overflow-hidden rounded-[var(--radius-panel)] shadow-[var(--shadow-lifted)]">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={brandImagery.home.hero.src}
                  alt={brandImagery.home.hero.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(14,20,28,0.35),rgba(14,20,28,0))]" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {[
                { k: 'Capability first', v: 'Core judgement, agility, and drive' },
                { k: 'Role agnostic', v: 'Transferable leaders across functions and sectors' },
                { k: 'Built for execution', v: 'Leadership choices tied to business outcomes' },
              ].map((item, index) => (
                <div
                  key={item.k}
                  className={`p-6 ${
                    index === 0
                      ? 'rounded-tl-[var(--radius-cut)] rounded-br-[var(--radius-card)] bg-[var(--site-blueprint-tint)] shadow-[var(--shadow-soft)]'
                      : index === 1
                        ? 'rounded-[var(--radius-card)] border border-[var(--site-border-soft)] bg-[var(--site-surface-elevated)] shadow-[var(--shadow-lifted)]'
                        : 'rounded-tr-[var(--radius-cut)] rounded-bl-[var(--radius-card)] bg-[color:var(--site-cta-soft)] shadow-[var(--shadow-soft)]'
                  }`}
                >
                  <p className="font-eyebrow text-[11px] uppercase tracking-[0.2em] text-[var(--site-text-muted)]">{item.k}</p>
                  <p className="mt-2 font-serif text-[22px] leading-[1.15] text-[var(--site-text-primary)]">{item.v}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <LogoRail />

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.3em] text-[var(--site-text-muted)]">Capabilities</p>
            <h2 className="max-w-4xl font-serif text-[clamp(2.2rem,5vw,4.4rem)] leading-[0.95] text-[var(--site-text-primary)]">
              Find, assess, and build
              <span className="block text-[var(--site-accent-strong)]">leadership capability.</span>
            </h2>
          </Reveal>

          <div className="mt-14 space-y-12">
            {servicesContent.map((service, index) => (
              <Reveal key={service.slug} delay={index * 0.05}>
                <TransitionLink href={`/capabilities/${service.slug}`} className="group block">
                  <div className="grid grid-cols-1 gap-6 border-t border-[var(--site-border-soft)] pt-8 md:grid-cols-[130px_1fr_220px] md:items-start">
                    <div className="font-eyebrow text-xs uppercase tracking-[0.22em] text-[var(--site-text-muted)]">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h3 className="font-serif text-3xl leading-[1.05] text-[var(--site-text-primary)] transition-colors group-hover:text-[var(--site-accent-strong)] md:text-[42px]">
                        {service.name}
                      </h3>
                      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">
                        {service.summary}
                      </p>
                    </div>
                    <div className="font-cta text-sm font-semibold uppercase tracking-[0.14em] text-[var(--site-link)]">
                      {service.primaryActionLabel}
                    </div>
                  </div>
                </TransitionLink>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[0.9fr_1.1fr] md:items-center md:px-12">
          <Reveal>
            <div className="relative overflow-hidden rounded-[var(--radius-panel)] shadow-[var(--shadow-soft)]">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={brandImagery.home.split.src}
                  alt={brandImagery.home.split.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 34vw"
                />
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.3em] text-[var(--site-text-muted)]">How we work</p>
              <h2 className="max-w-3xl font-serif text-[clamp(2rem,4vw,3.6rem)] leading-[0.98] text-[var(--site-text-primary)]">
                We build leadership decisions
                <span className="block text-[var(--site-accent-strong)]">on evidence, not assumption.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">
                Every engagement follows the same sequence: define what success requires, assess leadership capability against that standard, and build the team structure to deliver.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <a
                href={MAILTO_GENERAL}
                className="font-cta mt-9 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
              >
                Build your leadership plan
              </a>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  )
}
