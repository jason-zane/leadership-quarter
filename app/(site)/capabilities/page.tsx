import Image from 'next/image'
import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesContent } from '@/utils/brand/services-content'

export const metadata: Metadata = {
  title: 'Capabilities',
  description:
    'Explore Leadership Quarter capabilities for finding, assessing, and building leadership talent across industries and roles.',
}

const capabilityImages = {
  'executive-search': brandImagery.services.executiveSearch,
  'talent-consulting': brandImagery.services.talentConsulting,
  'executive-assessment': brandImagery.services.executiveAssessment,
  'succession-planning': brandImagery.services.successionPlanning,
  'talent-strategy': brandImagery.services.talentStrategy,
}

export default function CapabilitiesPage() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-24 pt-40 md:pb-32 md:pt-52" style={{ background: 'var(--site-gradient-stage)' }}>
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.3em] text-[var(--site-text-secondary)]">Capabilities</p>
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.9rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              Capability-focused support
              <span className="block text-[var(--site-accent-strong)]">for leadership decisions.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">
              Our capabilities work as one system: define success, assess leaders against evidence, and build teams for execution. We are industry and role agnostic, with a consistent focus on capability, agility, and drive.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          {servicesContent.map((capability, index) => {
            const image = capabilityImages[capability.slug]
            const isEven = index % 2 === 0
            const panelClass =
              index % 3 === 0
                ? 'bg-[var(--site-blueprint-tint)]'
                : index % 3 === 1
                  ? 'site-glass-card-strong'
                  : 'bg-[color:var(--site-cta-soft)]'

            return (
              <Reveal key={capability.slug} delay={index * 0.05}>
                <article className="mb-20 border-t border-[var(--site-border-soft)] pt-10">
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
                    <div className={`md:col-span-5 ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                      <div
                        className={`site-glass-card-strong relative overflow-hidden ${
                          index % 2 === 0
                            ? 'rounded-tl-[var(--radius-cut)] rounded-br-[var(--radius-card)]'
                            : 'rounded-tr-[var(--radius-cut)] rounded-bl-[var(--radius-card)]'
                        }`}
                      >
                        <div className="relative aspect-[4/3] w-full">
                          <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            className="object-cover object-top"
                            sizes="(max-width: 768px) 100vw, 42vw"
                          />
                        </div>
                      </div>
                    </div>

                    <div
                      className={`md:col-span-7 ${isEven ? 'md:order-2' : 'md:order-1'} ${panelClass} h-full rounded-[var(--radius-card)] border border-[var(--site-border-soft)] p-7 shadow-[var(--shadow-soft)] md:p-9`}
                    >
                      <p className="font-eyebrow text-[11px] uppercase tracking-[0.22em] text-[var(--site-text-muted)]">
                        {String(index + 1).padStart(2, '0')} / 05
                      </p>
                      <h2 className="site-heading-section mt-3 font-serif text-[clamp(2rem,4vw,3rem)] text-[var(--site-text-primary)]">
                        {capability.name}
                      </h2>
                      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">
                        {capability.description}
                      </p>

                      <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-[var(--site-text-body)] md:grid-cols-2">
                        {capability.includes.slice(0, 4).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>

                      <TransitionLink
                        href={`/capabilities/${capability.slug}`}
                        className="font-cta mt-7 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-6 py-2.5 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
                      >
                        {capability.primaryActionLabel}
                      </TransitionLink>
                    </div>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>
      </section>
    </div>
  )
}
