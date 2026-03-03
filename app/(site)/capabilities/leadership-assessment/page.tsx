import Image from 'next/image'
import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesBySlug } from '@/utils/brand/services-content'

export const metadata: Metadata = {
  title: 'Leadership Assessment',
  description: 'Assess leadership capability with clear evidence for high-stakes decisions across executive and broader organisational contexts.',
}

const capability = servicesBySlug['leadership-assessment']

const assessmentMethods = [
  {
    label: 'Psychometric',
    description: 'Validated instruments measuring personality, cognitive style, and behavioural tendencies across leadership-relevant dimensions.',
  },
  {
    label: 'Behavioural',
    description: 'Structured interviews and observation protocols that surface how leaders have actually operated in complex, real-world conditions.',
  },
  {
    label: 'Judgement-focused',
    description: 'Scenario-based evaluation of decision quality, risk calibration, and reasoning under ambiguity and pressure.',
  },
]

export default function LeadershipAssessmentPage() {
  const image = brandImagery.services.executiveAssessment

  return (
    <div className="text-[var(--site-text-primary)]">
      {/* Hero */}
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
                &ldquo;Independent assessment eliminates the bias of proximity — you see the candidate, not the relationship.&rdquo;
              </p>
              <p className="font-eyebrow mt-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Leadership Quarter approach</p>
            </blockquote>
          </Reveal>
        </div>
      </section>

      {/* Assessment methodology — three columns */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How we assess</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {assessmentMethods.map((method, index) => (
              <Reveal key={method.label} delay={index * 0.06}>
                <div className="site-card-sub h-full p-6">
                  <h3 className="font-serif text-2xl text-[var(--site-text-primary)]">{method.label}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">{method.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Framework connection */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="site-card-tint p-8 md:p-10">
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Built on LQ8 Leadership</p>
              <h2 className="font-serif text-[clamp(1.8rem,3.2vw,2.6rem)] leading-[1.15] text-[var(--site-text-primary)]">
                Assessment dimensions mapped to LQ8 competencies.
              </h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-[var(--site-text-body)]">
                Every assessment is structured around LQ8 — eight validated leadership dimensions covering capability, judgement, agility, drive, and more. The result is a comparative readiness profile that goes beyond seniority and experience to surface what actually predicts performance.
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
