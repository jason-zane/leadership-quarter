import Image from 'next/image'
import type { Metadata } from 'next'
import { StructuredData } from '@/components/site/structured-data'
import { Reveal } from '@/components/site/reveal'
import { SiteProcessDiagram } from '@/components/site/site-process-diagram'
import { TransitionLink } from '@/components/site/transition-link'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesBySlug } from '@/utils/brand/services-content'
import { buildPublicMetadata } from '@/utils/site/public-metadata'
import { getBreadcrumbSchema, getServiceSchema } from '@/utils/site/structured-data'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Executive Search',
  description:
    'Executive search for organisations that need sharper leadership appointments, with assessment grounded in judgement, agility, and drive.',
  path: '/capabilities/executive-search',
})

const capability = servicesBySlug['executive-search']

const searchPhases = [
  {
    step: '01',
    label: 'Brief and role definition',
    description:
      'Align on business context, leadership expectations, required capabilities, and the target market for the role.',
  },
  {
    step: '02',
    label: 'Talent mapping',
    description:
      'Build a structured view of the relevant leadership market across target companies, adjacent organisations, and comparable roles.',
  },
  {
    step: '03',
    label: 'Qualified longlist',
    description:
      'Discreetly approach and qualify potential candidates for leadership capability, motivation, alignment, and likely timing.',
  },
  {
    step: '04',
    label: 'Shortlist development',
    description:
      'Evaluate the strongest candidates in more depth and shape a focused shortlist for client consideration.',
  },
  {
    step: '05',
    label: 'Client interviews',
    description:
      'Support interview preparation, candidate coordination, and decision alignment through structured client interview stages.',
  },
  {
    step: '06',
    label: 'Offer and appointment',
    description:
      'Manage final negotiations, support appointment decisions, and help the process land in a successful transition.',
  },
]

const engagementOptions = [
  {
    label: 'Full Executive Search',
    description:
      'A full six-stage search process from brief through to offer and appointment support.',
    points: [
      'Best for critical leadership appointments where end-to-end support is required',
      'Combines market mapping, candidate qualification, shortlist development, and appointment support',
    ],
    tone: 'primary',
  },
  {
    label: 'Shortlist Development',
    description:
      'Bring Leadership Quarter in when you need deeper evaluation and a stronger shortlist for final-stage decision making.',
    points: [
      'Useful when there is already market context or an emerging candidate field',
      'Adds structured assessment and sharper shortlist discipline',
    ],
    tone: 'tint',
  },
  {
    label: 'Qualified Longlist',
    description:
      'A targeted engagement focused on mapping and qualifying the market so clients can move forward with a stronger starting pool.',
    points: [
      'Designed for clients who want validated market coverage without a full search mandate',
      'Creates a qualified candidate pool for internal progression or later-stage search support',
    ],
    tone: 'primary',
  },
  {
    label: 'Talent Mapping Project',
    description:
      'A standalone mapping engagement to build a clear view of the leadership market before a role is formally activated.',
    points: [
      'Useful for succession planning, benchmarking, and early search preparation',
      'Helps clients see the broader market before deciding how to proceed',
    ],
    tone: 'tint',
  },
] as const

const assessmentSignals = [
  {
    title: 'Capability fit',
    description: 'Evidence of being able to deliver the role outcomes the context demands, not just repeat past scope.',
  },
  {
    title: 'Judgement quality',
    description: 'How decisions are made under pressure, ambiguity, and competing stakeholder expectations.',
  },
  {
    title: 'Agility',
    description: 'The ability to transfer strengths into a new mandate, market, or operating environment.',
  },
  {
    title: 'Drive',
    description: 'The ownership, energy, and follow-through required to sustain performance once appointed.',
  },
]

export default function ExecutiveSearchPage() {
  const image = brandImagery.services.executiveSearch

  return (
    <div className="text-[var(--site-text-primary)]">
      <StructuredData
        data={[
          getBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Capabilities', path: '/capabilities' },
            { name: capability.name, path: '/capabilities/executive-search' },
          ]),
          getServiceSchema({
            service: capability,
            path: '/capabilities/executive-search',
          }),
        ]}
      />
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

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.15fr_0.85fr] md:px-12">
          <Reveal>
            <div>
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What this solves</p>
              <p className="text-lg leading-relaxed text-[var(--site-text-body)]">
                Executive search is strongest when the brief is tied to future context, not just familiar pedigree. This capability sharpens the role definition, the market view, and the final appointment decision.
              </p>

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
                &ldquo;Search works best when the mandate is built around future outcomes, not just a familiar profile.&rdquo;
              </p>
              <p className="font-eyebrow mt-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Leadership Quarter approach</p>
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How we deliver a search</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.4vw,3.3rem)] text-[var(--site-text-primary)]">
              A six-stage search process from
              <span className="block text-[var(--site-accent-strong)]">brief to appointment.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The process is structured enough to keep quality high, but practical enough to keep decisions moving.
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mt-8">
              <SiteProcessDiagram
                items={searchPhases.map((phase) => ({
                  step: phase.step,
                  title: phase.label,
                  description: phase.description,
                }))}
              />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Engagement model</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.2vw,3.1rem)] text-[var(--site-text-primary)]">
              Flexible ways to engage
              <span className="block text-[var(--site-accent-strong)]">across the search process.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The full six-stage model is available as an end-to-end search, but clients can also engage selected stages where targeted support is the better fit.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {engagementOptions.map((model, index) => (
              <Reveal key={model.label} delay={index * 0.05}>
                <article className={`${model.tone === 'primary' ? 'site-card-primary' : 'site-card-tint'} h-full p-7`}>
                  <h3 className="font-serif text-3xl leading-[1.08] text-[var(--site-text-primary)]">{model.label}</h3>
                  <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{model.description}</p>
                  <ul className="mt-5 space-y-2 text-sm leading-relaxed text-[var(--site-text-body)]">
                    {model.points.map((point) => (
                      <li key={point} className="flex items-baseline gap-1.5">
                        <span className="shrink-0 text-[var(--site-text-muted)]">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What we assess</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.2vw,3.1rem)] text-[var(--site-text-primary)]">
              Beyond track record,
              <span className="block text-[var(--site-accent-strong)]">we assess for sustained performance.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The longlist and shortlist stages are strengthened by structured assessment. Experience matters, but the final decision improves when capability is tested against the qualities that predict performance in a new context.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {assessmentSignals.map((signal, index) => (
              <Reveal key={signal.title} delay={index * 0.05}>
                <div className="site-card-sub h-full p-6">
                  <h3 className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">{signal.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">{signal.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <div className="site-card-tint mt-8 p-8 md:p-10">
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Built on LQ8 Leadership</p>
              <p className="max-w-3xl font-serif text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.15] text-[var(--site-text-primary)]">
                A search process grounded in capability, judgement, agility, and drive.
              </p>
              <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
                LQ8 provides the assessment lens for understanding how leaders are likely to perform once appointed, not just how their background reads on paper. It helps bring sharper evidence into shortlist and final selection decisions.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <TransitionLink
                  href="/framework/lq8"
                  className="font-eyebrow inline-block text-xs uppercase tracking-[0.08em] text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4"
                >
                  Explore the LQ8 framework
                </TransitionLink>
                <TransitionLink
                  href="/work-with-us#inquiry-form"
                  className="font-eyebrow inline-block text-xs uppercase tracking-[0.08em] text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4"
                >
                  Talk to us about a search
                </TransitionLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
