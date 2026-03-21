import Image from 'next/image'
import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { LogoRail } from '@/components/site/logo-rail'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesContent } from '@/utils/brand/services-content'
import { BRAND_DESCRIPTOR } from '@/utils/brand/site-brand'
import { buildPublicMetadata } from '@/utils/site/public-metadata'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Executive Search, Leadership Assessment, and Succession',
  description:
    'Leadership Quarter helps boards, CEOs, and founders make sharper appointments, assessment, and succession decisions, grounded in evidence on capability, judgement, agility, and drive.',
  path: '/',
})

export default function HomePage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.1fr_0.9fr] md:items-start md:px-12">
          <div>
            <Reveal>
              <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">{BRAND_DESCRIPTOR}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.9rem,7.4vw,5.9rem)] text-[var(--site-text-primary)]">
                Find leaders with
                <span className="block text-[var(--site-accent-strong)]">the capability to deliver</span>
                what is next.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">
                Leadership Quarter helps boards, CEOs, and founders make sharper appointments, assessment, and succession decisions, grounded in evidence on capability, judgement, agility, and drive.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              <div className="mt-10">
                <TransitionLink
                  href="/capabilities"
                  className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3.5 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
                >
                  Explore capabilities
                </TransitionLink>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} y={26}>
            <div className="site-image-frame relative">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={brandImagery.home.hero.src}
                  alt={brandImagery.home.hero.alt}
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(14,20,28,0.35),rgba(14,20,28,0))]" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mb-8 md:mb-10">
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.1em] text-[var(--site-text-muted)]">Our approach</p>
              <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.95rem,4.6vw,3.35rem)] text-[var(--site-text-primary)]">
                A sharper standard
                <span className="block text-[var(--site-accent-strong)]">for leadership quality.</span>
              </h2>
              <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
                The goal is not to find the most familiar profile. It is to identify leaders who can perform in the context ahead.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-fr">
              {[
                { k: 'Context first', v: 'Roles defined against business stage, strategy, and leadership risk' },
                { k: 'Capability evidence', v: 'Assessment built around judgement, agility, drive, and delivery' },
                { k: 'Practical decisions', v: 'Recommendations designed to help boards and executives decide with confidence' },
              ].map((item, index) => (
                <div
                  key={item.k}
                  className={`h-full p-6 ${
                    index === 0
                      ? 'site-card-tint rounded-tl-[var(--radius-cut)] rounded-br-[var(--radius-card)]'
                      : index === 1
                        ? 'site-card-primary'
                        : 'site-card-tint rounded-tr-[var(--radius-cut)] rounded-bl-[var(--radius-card)]'
                  }`}
                >
                  <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{item.k}</p>
                  <p className="mt-2 font-serif text-[22px] leading-[1.17] tracking-[-0.005em] text-[var(--site-text-primary)]">{item.v}</p>
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
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.1em] text-[var(--site-text-muted)]">Capabilities</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2.2rem,5vw,4.2rem)] text-[var(--site-text-primary)]">
              Find, assess, and appoint
              <span className="block text-[var(--site-accent-strong)]">leadership capability.</span>
            </h2>
          </Reveal>

          <div className="mt-14 space-y-12">
            {servicesContent.map((service, index) => (
              <Reveal key={service.slug} delay={index * 0.05}>
                <TransitionLink href={`/capabilities/${service.slug}`} className="group block">
                  <div
                    className={`grid grid-cols-1 gap-6 pt-8 md:grid-cols-[130px_1fr_220px] md:items-start ${
                      index === 0 ? '' : 'border-t border-[var(--site-border-soft)]'
                    }`}
                  >
                    <div className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
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
                    <div className="font-eyebrow text-xs uppercase tracking-[0.1em] text-[var(--site-link)]">
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
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.1em] text-[var(--site-text-muted)]">Frameworks</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.4vw,3.6rem)] text-[var(--site-text-primary)]">
              Frameworks for leadership
              <span className="block text-[var(--site-accent-strong)]">and AI readiness.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              Use LQ8 Leadership to assess core leadership capability, and LQ AI Readiness & Enablement to assess judgement, adoption behaviour, and execution quality in AI-enabled environments.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Reveal>
              <TransitionLink href="/framework/lq8" className="group block h-full">
                <article className="site-card-primary h-full p-7">
                  <h3 className="font-serif text-4xl leading-[1.08] text-[var(--site-text-primary)] transition-colors group-hover:text-[var(--site-accent-strong)]">
                    LQ8 Leadership
                  </h3>
                  <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
                    A practical leadership capability model built around four quadrants and eight competencies for hiring, development, and succession decisions.
                  </p>
                  <span className="font-eyebrow mt-8 inline-block text-[11px] uppercase tracking-[0.1em] text-[var(--site-link)]">
                    Explore LQ8 Leadership
                  </span>
                </article>
              </TransitionLink>
            </Reveal>

            <Reveal delay={0.06}>
              <TransitionLink href="/framework/lq-ai-readiness" className="group block h-full">
                <article className="site-card-tint h-full p-7">
                  <h3 className="font-serif text-4xl leading-[1.08] text-[var(--site-text-primary)] transition-colors group-hover:text-[var(--site-accent-strong)]">
                    LQ AI Readiness & Enablement
                  </h3>
                  <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
                    A grounded framework for assessing whether leaders and teams can adopt AI effectively, audit outputs critically, and improve decision quality at speed.
                  </p>
                  <span className="font-eyebrow mt-8 inline-block text-[11px] uppercase tracking-[0.1em] text-[var(--site-link)]">
                    Explore LQ AI Readiness & Enablement
                  </span>
                </article>
              </TransitionLink>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <TransitionLink
              href="/framework"
              className="font-ui mt-6 inline-block text-sm font-semibold tracking-[0.01em] text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4 transition-colors hover:text-[var(--site-link-hover)]"
            >
              View all frameworks
            </TransitionLink>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[0.9fr_1.1fr] md:items-start md:px-12">
          <Reveal>
            <div className="site-image-frame relative">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={brandImagery.home.split.src}
                  alt={brandImagery.home.split.alt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 34vw"
                />
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.1em] text-[var(--site-text-muted)]">Work with us</p>
              <h2 className="site-heading-section max-w-3xl font-serif text-[clamp(2rem,4vw,3.5rem)] text-[var(--site-text-primary)]">
                Choose the engagement model
                <span className="block text-[var(--site-accent-strong)]">that fits your organisation.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">
                Choose a standard engagement or a more embedded partnership, depending on the pace, context, and level of support you need.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <TransitionLink
                href="/work-with-us"
                className="font-cta mt-9 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
              >
                See how we work
              </TransitionLink>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  )
}
