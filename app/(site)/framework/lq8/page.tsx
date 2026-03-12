import type { Metadata } from 'next'
import { StructuredData } from '@/components/site/structured-data'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { TransitionLink } from '@/components/site/transition-link'
import { lq8Applications, lq8Competencies, lq8Quadrants } from '@/utils/brand/lq8-content'
import { buildPublicMetadata } from '@/utils/site/public-metadata'
import { getBreadcrumbSchema } from '@/utils/site/structured-data'

export const metadata: Metadata = buildPublicMetadata({
  title: 'LQ8 Leadership',
  description:
    "LQ8 Leadership is Leadership Quarter's model for understanding leadership capability across four quadrants and eight competencies.",
  path: '/framework/lq8',
})

const quadrantCardStyles: Record<string, string> = {
  'inner-compass': 'bg-[linear-gradient(155deg,rgba(70,119,178,0.18),rgba(255,255,255,0.56))]',
  'thinking-in-motion': 'bg-[linear-gradient(155deg,rgba(89,145,201,0.18),rgba(255,255,255,0.56))]',
  'relating-to-others': 'bg-[linear-gradient(155deg,rgba(63,106,159,0.18),rgba(255,255,255,0.56))]',
  'progress-and-growth': 'bg-[linear-gradient(155deg,rgba(102,158,214,0.18),rgba(255,255,255,0.56))]',
}

export default function Lq8FrameworkPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <StructuredData
        data={getBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Frameworks', path: '/framework' },
          { name: 'LQ8 Leadership', path: '/framework/lq8' },
        ])}
      />
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Frameworks</p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              LQ8 Leadership
              <span className="block text-[var(--site-accent-strong)]">a high-level view of leadership capability.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              Why LQ8
            </p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.4vw,3.2rem)] text-[var(--site-text-primary)]">
              A practical framework for
              <span className="block text-[var(--site-accent-strong)]">higher-quality leadership decisions.</span>
            </h2>
            <p className="mt-5 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
              LQ8 gives decision-makers a shared language for evaluating leadership capability under pressure, linking behaviour directly to execution outcomes.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-fr">
            <Reveal>
              <article className="site-card-primary h-full p-6">
                <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Why it matters now</p>
                <h2 className="mt-2 font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">Leadership under real pressure</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                  Leadership decisions are made in information-rich environments where pace is high and certainty is low. LQ8 helps improve decision quality without losing speed.
                </p>
              </article>
            </Reveal>

            <Reveal delay={0.05}>
              <article className="site-card-primary h-full p-6">
                <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What LQ8 is</p>
                <h2 className="mt-2 font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">A connected capability model</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                  LQ8 combines four quadrants and eight competencies into one integrated system. It treats leadership as an operating capability, not a checklist of isolated traits.
                </p>
              </article>
            </Reveal>

            <Reveal delay={0.1}>
              <article className="site-card-tint h-full p-6">
                <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How it is used</p>
                <h2 className="mt-2 font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">Built for practical decisions</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                  Organisations use LQ8 across hiring, development, succession, and performance conversations to create clearer standards and stronger leadership outcomes.
                </p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Framework at a glance</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.8vw,3.8rem)] text-[var(--site-text-primary)]">
              Four quadrants, eight competencies,
              <span className="block text-[var(--site-accent-strong)]">one integrated leadership model.</span>
            </h2>
            <p className="mt-5 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
              Each competency maps to one quadrant, but the value comes from how the full system works together. Strong leadership profiles are built through balance, not one standout trait.
            </p>
            <p className="mt-4 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
              This structure is designed for decision-makers working across complex teams and changing tools, where leaders need to align people, judgement, and execution at the same time.
            </p>
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {lq8Quadrants.map((quadrant, quadrantIndex) => {
              const quadrantCompetencies = lq8Competencies.filter((competency) => competency.quadrant === quadrant.id)
              return (
                <Reveal key={quadrant.id} delay={quadrantIndex * 0.04}>
                  <section
                    className={`rounded-[var(--radius-card)] border border-[var(--site-border-soft)] p-4 shadow-[var(--shadow-soft)] md:p-5 ${quadrantCardStyles[quadrant.id] ?? 'site-glass-card'}`}
                  >
                    <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{quadrant.name}</p>
                    <div className="mt-3 grid grid-cols-1 gap-3">
                      {quadrantCompetencies.map((competency) => (
                        <article key={competency.id} className="site-glass-card h-[184px] rounded-[var(--radius-card)] p-4">
                          <p className="font-serif text-[1.3rem] leading-[1.12] text-[var(--site-text-primary)]">{competency.name}</p>
                          <p className="mt-2 text-sm leading-relaxed text-[var(--site-text-body)]">{competency.definition}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </Reveal>
              )
            })}
          </div>

          <Reveal delay={0.08}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <p className="text-sm leading-relaxed text-[var(--site-text-body)]">
                Want to explore how LQ8 could apply in your context?
              </p>
              <TransitionLink
                href="/work-with-us#inquiry-form"
                className="font-cta inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
              >
                Learn more about this
              </TransitionLink>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How organisations use LQ8</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.7vw,3.6rem)] text-[var(--site-text-primary)]">
              Use LQ8 to align decisions,
              <span className="block text-[var(--site-accent-strong)]">capability, and execution.</span>
            </h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {lq8Applications.map((application, index) => (
              <Reveal key={application.title} delay={index * 0.05}>
                <article className={`h-full p-7 ${index % 2 === 0 ? 'site-card-primary' : 'site-card-tint'}`}>
                  <h3 className="font-serif text-3xl leading-[1.08] text-[var(--site-text-primary)]">{application.title}</h3>
                  <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{application.description}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <ImmersiveCtaBand
              eyebrow="Need a custom application?"
              title="Use LQ8 in your search, assessment, and succession work."
              description="If you want a tailored version of this framework in your operating context, we can help design and implement it."
              primaryHref="/work-with-us#inquiry-form"
              primaryLabel="Talk to us"
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
