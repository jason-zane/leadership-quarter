import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { InquiryForm } from '@/components/site/inquiry-form'
import { SiteProcessDiagram } from '@/components/site/site-process-diagram'
import { CONTACT_EMAIL_LABEL, CONTACT_PHONE, MAILTO_GENERAL, TEL_GENERAL } from '@/utils/brand/contact'
import { buildPublicMetadata } from '@/utils/site/public-metadata'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Work with Us',
  description:
    'Start a conversation with Leadership Quarter about the leadership decision, transition, or capability question in front of you.',
  path: '/work-with-us',
})

const deliverySteps = [
  {
    step: '01',
    title: 'Discovery and context framing',
    description:
      'We align on business priorities, leadership risks, stakeholder expectations, and decision timelines.',
    outputs: 'Scoped brief, success criteria, and operating constraints.',
  },
  {
    step: '02',
    title: 'Engagement design',
    description:
      'We select the right delivery model, set governance cadence, and define who makes which decisions at each stage.',
    outputs: 'Working model, meeting rhythm, and accountability map.',
  },
  {
    step: '03',
    title: 'Delivery in rhythm',
    description:
      'We execute search, assessment, and succession work through practical decision support, progress checkpoints, and fast iteration.',
    outputs: 'Evidence-backed recommendations and decision-ready options.',
  },
  {
    step: '04',
    title: 'Handover and next cycle',
    description:
      'We close with clear ownership, capability uplift actions, and a forward plan for future leadership decisions.',
    outputs: 'Handover pack, capability priorities, and implementation path.',
  },
]

export default function WorkWithUsPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Work with us</p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              Start with the decision
              <span className="block text-[var(--site-accent-strong)]">you need to make.</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              Leadership Quarter structures engagements around business context, decision pace, and the level of support required. Some clients need a defined mandate; others need a closer operating partnership.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[calc(var(--space-section-y)*0.82)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Engagement options</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.7vw,3.7rem)] text-[var(--site-text-primary)]">
              Defined external support
              <span className="block text-[var(--site-accent-strong)]">or a closer embedded partnership.</span>
            </h2>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Reveal>
              <article className="site-card-primary h-full p-7">
                <h3 className="font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">Standard engagement</h3>
                <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
                  Best when you need a specialist external partner for a defined search, assessment, or succession mandate with clear milestones and reporting points.
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-relaxed text-[var(--site-text-body)]">
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Structured scope, timeline, and governance</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Clear decision checkpoints with leadership stakeholders</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Independent evidence-led recommendations</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Strong fit for focused, time-bound priorities</span></li>
                </ul>
              </article>
            </Reveal>

            <Reveal delay={0.06}>
              <article className="site-card-tint h-full p-7">
                <h3 className="font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">Embedded partnership</h3>
                <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
                  Built for organisations that want integrated support inside business rhythms. We work closely with your executive, people, and hiring stakeholders to accelerate decisions without sacrificing rigour.
                </p>
                <ul className="mt-5 space-y-2 text-sm leading-relaxed text-[var(--site-text-body)]">
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>In-team cadence through weekly or fortnightly operating cycles</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Deeper context on priorities, culture, and stakeholder dynamics</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Faster iteration across search, assessment, and succession decisions</span></li>
                  <li className="flex items-baseline gap-1.5"><span className="shrink-0 text-[var(--site-text-muted)]">•</span><span>Practical ownership transfer so internal capability strengthens over time</span></li>
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-[calc(var(--space-section-y)*0.82)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What to expect</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.3vw,3.2rem)] text-[var(--site-text-primary)]">
              A practical process from context
              <span className="block text-[var(--site-accent-strong)]">to implementation.</span>
            </h2>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="mt-8">
              <SiteProcessDiagram
                items={deliverySteps.map((step) => ({
                  step: step.step,
                  title: step.title,
                  description: step.description,
                  outcome: step.outputs,
                }))}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section id="inquiry-form" className="py-[calc(var(--space-section-y)*0.82)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Get in touch</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.3vw,3.2rem)] text-[var(--site-text-primary)]">
              Talk to us about your priorities.
              <span className="block text-[var(--site-accent-strong)]">Start with your context.</span>
            </h2>
          </Reveal>

          <div className="mt-8 space-y-5">
            <Reveal delay={0.04}>
              <div className="site-card-strong p-7 md:p-9">
                <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Contact information</p>
                <h3 className="site-heading-section max-w-3xl font-serif text-[clamp(1.6rem,3.2vw,2.2rem)] text-[var(--site-text-primary)]">
                  Reach us directly.
                </h3>
                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="site-card-sub p-4">
                    <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Email</p>
                    <a
                      href={MAILTO_GENERAL}
                      className="mt-2 inline-block text-sm font-semibold text-[var(--site-text-primary)] transition-colors hover:text-[var(--site-link-hover)]"
                    >
                      {CONTACT_EMAIL_LABEL}
                    </a>
                  </div>
                  <div className="site-card-sub p-4">
                    <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Phone</p>
                    <a
                      href={TEL_GENERAL}
                      className="mt-2 inline-block text-sm font-semibold text-[var(--site-text-primary)] transition-colors hover:text-[var(--site-link-hover)]"
                    >
                      {CONTACT_PHONE}
                    </a>
                  </div>
                  <div className="site-card-sub p-4">
                    <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Location</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--site-text-primary)]">Sydney, Australia</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[var(--site-text-body)]">We typically respond within one to two business days.</p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <InquiryForm />
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  )
}
