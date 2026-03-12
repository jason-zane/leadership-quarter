import Image from 'next/image'
import type { Metadata } from 'next'
import { StructuredData } from '@/components/site/structured-data'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesBySlug } from '@/utils/brand/services-content'
import { buildPublicMetadata } from '@/utils/site/public-metadata'
import { getBreadcrumbSchema, getServiceSchema } from '@/utils/site/structured-data'

export const metadata: Metadata = buildPublicMetadata({
  title: 'AI Readiness & Enablement',
  description:
    'AI readiness and enablement for teams that need stronger judgement, adoption discipline, and human capability with AI.',
  path: '/capabilities/ai-readiness',
})

const capability = servicesBySlug['ai-readiness']

const capabilityGap = {
  have: {
    eyebrow: 'What organisations have',
    items: ['AI tools and automation platforms', 'Data pipelines and integration layers', 'Vendor agreements and access licenses', 'Usage policies and governance frameworks'],
  },
  need: {
    eyebrow: 'What organisations need',
    items: ['Judgement and critical thinking in AI-assisted decisions', 'Adoption discipline and workflow integration', 'Output auditing and accuracy calibration', 'Operating model design for human-AI collaboration'],
  },
}

const assessmentDimensions = [
  {
    label: 'Judgement under AI support',
    description: 'How well do leaders and teams maintain decision quality when AI provides recommendations, analysis, or drafts?',
  },
  {
    label: 'Adoption behaviour',
    description: 'Are people actually using AI tools effectively in their workflows, or avoiding, over-relying, or misapplying them?',
  },
  {
    label: 'Output auditing capability',
    description: 'Can teams critically evaluate AI outputs for accuracy, bias, and fitness-for-purpose before acting on them?',
  },
  {
    label: 'Operating model integration',
    description: 'Is the organisation designed to support consistent, accountable human-AI collaboration at pace?',
  },
]

export default function AIReadinessPage() {
  const image = brandImagery.services.talentStrategy

  return (
    <div className="text-[var(--site-text-primary)]">
      <StructuredData
        data={[
          getBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Capabilities', path: '/capabilities' },
            { name: capability.name, path: '/capabilities/ai-readiness' },
          ]),
          getServiceSchema({
            service: capability,
            path: '/capabilities/ai-readiness',
          }),
        ]}
      />
      {/* Hero — full-width text with background image wash */}
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-28 md:pt-56">
        <div className="absolute inset-0 -z-10">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            className="object-cover object-top opacity-[0.08]"
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

      {/* The capability gap — two-column contrast block */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">The capability gap</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Reveal>
              <div className="site-card-primary h-full p-7">
                <p className="font-eyebrow mb-4 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{capabilityGap.have.eyebrow}</p>
                <ul className="space-y-3 text-base leading-relaxed text-[var(--site-text-body)]">
                  {capabilityGap.have.items.map((item) => (
                    <li key={item} className="flex items-baseline gap-1.5">
                      <span className="shrink-0 text-[var(--site-text-muted)]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="site-card-tint h-full p-7">
                <p className="font-eyebrow mb-4 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{capabilityGap.need.eyebrow}</p>
                <ul className="space-y-3 text-base leading-relaxed text-[var(--site-text-body)]">
                  {capabilityGap.need.items.map((item) => (
                    <li key={item} className="flex items-baseline gap-1.5">
                      <span className="shrink-0 text-[var(--site-text-muted)]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">{capability.description}</p>
          </Reveal>
        </div>
      </section>

      {/* Assessment dimensions — 2×2 grid */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What we assess</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {assessmentDimensions.map((dimension, index) => (
              <Reveal key={dimension.label} delay={index * 0.05}>
                <div className="site-card-sub h-full p-6">
                  <h3 className="font-serif text-xl leading-[1.2] text-[var(--site-text-primary)]">{dimension.label}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">{dimension.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Recruitment application</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4vw,3rem)] text-[var(--site-text-primary)]">
              Strengthen hiring quality for AI-exposed roles.
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              AI Capability Assessment is a practical pre-hire filter when roles require strong
              judgement with AI tools, not just platform familiarity.
            </p>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Reveal>
              <div className="site-card-primary h-full p-6">
                <h3 className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">Compare observable behaviours</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                  Evaluate how candidates verify output quality, structure workflows, and navigate
                  model limits under pressure.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="site-card-tint h-full p-6">
                <h3 className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">Reduce mis-hire risk</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                  Flag overconfidence, novelty-driven usage, and weak critical evaluation before
                  appointment decisions are made.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="site-card-primary h-full p-6">
                <h3 className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">Hire for performance readiness</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                  Select people who can convert AI use into measurable outcomes and operational
                  consistency.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Framework connection */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="site-card-tint p-8 md:p-10">
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Built on LQ AI Readiness & Enablement</p>
              <h2 className="max-w-3xl font-serif text-[clamp(1.8rem,3.2vw,2.6rem)] leading-[1.15] text-[var(--site-text-primary)]">
                A structured model for human capability in AI-augmented environments.
              </h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-[var(--site-text-body)]">
                LQ AI Readiness & Enablement is a validated framework for assessing the human competencies that determine whether AI adoption improves or degrades decision quality in your organisation. It goes beyond tool access to measure the judgement, discipline, and operating model maturity that AI actually demands.
              </p>
              <TransitionLink
                href="/framework/lq-ai-readiness"
                className="font-eyebrow mt-6 inline-block text-xs uppercase tracking-[0.08em] text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4"
              >
                Explore LQ AI Readiness & Enablement
              </TransitionLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How delivery works */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How delivery works</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {capability.includes.map((item, index) => (
              <Reveal key={item} delay={index * 0.04}>
                <div className="site-card-primary relative p-6">
                  <span className="font-eyebrow absolute right-4 top-4 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="max-w-[88%] leading-relaxed text-[var(--site-text-body)]">{item}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Best suited to */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Best suited to</p>
            <ul className="space-y-3 text-base leading-relaxed text-[var(--site-text-body)]">
              {capability.audience.map((item) => (
                <li key={item} className="flex items-baseline gap-1.5">
                  <span className="shrink-0 text-[var(--site-text-muted)]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
