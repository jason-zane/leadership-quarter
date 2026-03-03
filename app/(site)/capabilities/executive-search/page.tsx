import Image from 'next/image'
import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesBySlug } from '@/utils/brand/services-content'

export const metadata: Metadata = {
  title: 'Executive Search',
  description: 'Identify and secure leaders with the judgement, agility, and drive your context demands.',
}

const capability = servicesBySlug['executive-search']

const searchPhases = [
  {
    label: 'Brief',
    description: 'Define outcome-based success criteria and role-critical capability profile',
  },
  {
    label: 'Mapping',
    description: 'Internal and external talent mapping across relevant and adjacent markets',
  },
  {
    label: 'Assessment',
    description: 'Evidence-based evaluation of capability, judgement, agility, and drive',
  },
  {
    label: 'Appointment',
    description: 'Selection, offer, and transition support aligned to first-year outcomes',
  },
]

export default function ExecutiveSearchPage() {
  const image = brandImagery.services.executiveSearch

  return (
    <div className="text-[var(--site-text-primary)]">
      {/* Hero */}
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-28 md:pt-56">
        <div className="absolute inset-0 -z-10">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className="object-cover object-center opacity-[0.08]"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--site-bg-base)] via-transparent to-[var(--site-bg-base)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Capability</p>
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.8rem,6vw,5.3rem)] text-[var(--site-text-primary)]">
              {capability.name}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">{capability.summary}</p>
          </Reveal>
        </div>
      </section>

      {/* What this solves */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.15fr_0.85fr] md:px-12">
          <Reveal>
            <div>
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What this solves</p>
              <p className="text-lg leading-relaxed text-[var(--site-text-body)]">{capability.description}</p>

              <p className="font-eyebrow mb-4 mt-10 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Best suited to</p>
              <ul className="space-y-3 text-base leading-relaxed text-[var(--site-text-body)]">
                {capability.audience.map((item) => (
                  <li key={item} className="flex items-baseline gap-1.5">
                    <span className="shrink-0 text-[var(--site-text-muted)]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote className="site-card-tint p-7">
              <p className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">
                &ldquo;Experience matters, but capability, agility, and drive are what sustain leadership performance.&rdquo;
              </p>
              <p className="font-eyebrow mt-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Leadership Quarter approach</p>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* How the search works — process step flow */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How the search works</p>
          </Reveal>

          {/* Desktop: horizontal step flow. Mobile: stacked */}
          <div className="relative grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-0">
            {searchPhases.map((phase, index) => (
              <Reveal key={phase.label} delay={index * 0.06}>
                <div className="relative flex md:flex-col">
                  {/* Connector line between steps (desktop only) */}
                  {index < searchPhases.length - 1 && (
                    <div className="absolute right-0 top-[1.75rem] hidden h-px w-1/2 translate-x-full bg-[var(--site-border-soft)] md:block" />
                  )}
                  <div className="site-card-primary h-full p-6 md:mx-2">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="font-eyebrow flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--site-border-soft)] text-[10px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-serif text-xl text-[var(--site-text-primary)]">{phase.label}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{phase.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What we prioritise — LQ8 callout */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="site-card-tint p-8 md:p-10">
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Built on LQ8 Leadership</p>
              <blockquote className="font-serif text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.15] text-[var(--site-text-primary)]">
                &ldquo;We assess for capability, agility, and drive — not just track record.&rdquo;
              </blockquote>
              <p className="mt-5 max-w-2xl leading-relaxed text-[var(--site-text-body)]">
                Every executive search mandate is underpinned by the LQ8 Leadership framework — eight validated dimensions that predict sustained leadership performance across roles, sectors, and cycles of change.
              </p>
              <TransitionLink
                href="/framework/lq8"
                className="font-eyebrow mt-6 inline-block text-xs uppercase tracking-[0.08em] text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4"
              >
                Explore the LQ8 framework
              </TransitionLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Case study */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="space-y-8">
              <ImmersiveCtaBand
                eyebrow="Case study"
                title={capability.caseStudy.client}
                description="A representative example of how this capability is delivered in live operating environments."
                primaryHref="/work-with-us#inquiry-form"
                primaryLabel={capability.primaryActionLabel}
              />

              <div className="site-card-strong p-8 md:p-10">
                <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
                  <div>
                    <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Challenge</p>
                    <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.challenge}</p>
                  </div>
                  <div>
                    <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Approach</p>
                    <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.approach}</p>
                  </div>
                  <div>
                    <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Impact</p>
                    <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.impact}</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
