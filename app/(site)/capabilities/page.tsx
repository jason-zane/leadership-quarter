import Image from 'next/image'
import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesContent } from '@/utils/brand/services-content'
import { buildPublicMetadata } from '@/utils/site/public-metadata'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Capabilities',
  description:
    'Explore where Leadership Quarter helps, from executive search and leadership assessment to succession strategy and AI capability and enablement.',
  path: '/capabilities',
})

const capabilityImages = {
  'executive-search': brandImagery.services.executiveSearch,
  'leadership-assessment': brandImagery.services.executiveAssessment,
  'succession-strategy': brandImagery.services.successionPlanning,
  'ai-readiness': brandImagery.services.talentStrategy,
}

export default function CapabilitiesPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Capabilities</p>
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.9rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              Where Leadership Quarter
              <span className="block text-[var(--site-accent-strong)]">helps most.</span>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">
              Each capability is designed for a distinct decision: appointing a leader, strengthening succession, assessing readiness, or building human capability for AI-enabled work.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">
              Explore{' '}
              <TransitionLink href="/framework" className="font-semibold text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4">
                Frameworks
              </TransitionLink>
              {' '}for the models that underpin this work, including LQ8 Leadership and LQ AI Capability & Enablement.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          {servicesContent.map((capability, index) => {
            const image = capabilityImages[capability.slug]
            const isEven = index % 2 === 0
            const panelClass = index % 2 === 0 ? 'site-card-tint' : 'site-card-primary'

            return (
              <Reveal key={capability.slug} delay={index * 0.05}>
                <article
                  className={`mb-20 pt-10 ${
                    index === 0 ? '' : 'border-t border-[var(--site-border-soft)]'
                  }`}
                >
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-12 md:items-start">
                    <div className={`md:col-span-5 ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                      <div
                        className={`site-image-frame relative ${
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

                    <div className={`md:col-span-7 ${isEven ? 'md:order-2' : 'md:order-1'} ${panelClass} h-full p-7 md:p-9`}>
                      <p className="font-eyebrow text-[11px] uppercase tracking-[0.1em] text-[var(--site-text-muted)]">
                        {String(index + 1).padStart(2, '0')} / 04
                      </p>
                      <h2 className="site-heading-section mt-3 font-serif text-[clamp(2rem,4vw,3rem)] text-[var(--site-text-primary)]">
                        {capability.name}
                      </h2>
                      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">
                        {capability.description}
                      </p>

                      <ul className="mt-6 grid grid-cols-1 gap-2 text-sm text-[var(--site-text-body)] md:grid-cols-2">
                        {capability.includes.slice(0, 4).map((item) => (
                          <li key={item} className="flex items-baseline gap-1.5">
                            <span className="shrink-0 text-[var(--site-text-muted)]">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <TransitionLink
                        href={`/capabilities/${capability.slug}`}
                        className="font-eyebrow mt-7 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-6 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
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

      <section id="embedded-partnership" className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Delivery model</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4vw,3.4rem)] text-[var(--site-text-primary)]">
              Two ways to engage:
              <span className="block text-[var(--site-accent-strong)]">standard or embedded.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              Choose the model that fits your pace, internal capability, and decision complexity. Both are practical, accountable, and designed around decision quality.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Reveal>
              <article className="site-card-primary h-full p-7">
                <h3 className="font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">Standard engagement</h3>
                <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
                  A focused external partnership for defined search, assessment, or succession priorities with clear scope, timelines, and governance.
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-relaxed text-[var(--site-text-body)]">
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Clear milestones and decision checkpoints</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Independent, evidence-backed recommendations</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Strong fit for focused, time-bound mandates</span></li>
                </ul>
              </article>
            </Reveal>

            <Reveal delay={0.06}>
              <article className="site-card-tint h-full p-7">
                <h3 className="font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">Embedded partnership</h3>
                <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
                  Integrated support inside your operating rhythm, combining in-house context with specialist search and assessment rigour.
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-relaxed text-[var(--site-text-body)]">
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Closer cadence with executive and people teams</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Faster iteration across complex decisions</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Strong fit for ongoing capability uplift</span></li>
                </ul>
              </article>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <TransitionLink
              href="/work-with-us"
              className="font-cta mt-8 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
            >
              Explore work with us
            </TransitionLink>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
