import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { buildPublicMetadata } from '@/utils/site/public-metadata'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Frameworks',
  description:
    'Explore the frameworks behind Leadership Quarter’s search, assessment, succession, and AI readiness work.',
  path: '/framework',
})

const frameworks = [
  {
    name: 'LQ8 Leadership',
    href: '/framework/lq8',
    summary:
      'A practical leadership capability model built around four quadrants and eight competencies for hiring, development, and succession decisions.',
    cta: 'Explore LQ8 Leadership',
  },
  {
    name: 'LQ AI Readiness & Enablement',
    href: '/framework/lq-ai-readiness',
    summary:
      'A grounded framework for assessing whether leaders and teams can adopt AI effectively, audit outputs critically, and improve decision quality at speed.',
    cta: 'Explore LQ AI Readiness & Enablement',
  },
]

const frameworkPrinciples = [
  {
    title: 'Create a shared standard',
    body: 'Frameworks give boards, CEOs, and leadership teams a common language for what good leadership looks like in practice.',
  },
  {
    title: 'Improve decision quality',
    body: 'They reduce ambiguity in hiring, assessment, and succession conversations by making expectations explicit and comparable.',
  },
  {
    title: 'Link assessment to action',
    body: 'The value is not theory alone. Each framework is designed to support real decisions, recommendations, and next steps.',
  },
]

export default function FrameworksPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Frameworks</p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              The frameworks behind
              <span className="block text-[var(--site-accent-strong)]">our search and assessment work.</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              Leadership Quarter uses frameworks to bring shared language, stronger judgement, and greater consistency into leadership, succession, and AI-readiness decisions.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Why frameworks matter</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.2vw,3.2rem)] text-[var(--site-text-primary)]">
              Not theory for its own sake.
              <span className="block text-[var(--site-accent-strong)]">A practical structure for better decisions.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              These frameworks are used to clarify expectations, sharpen assessment, and translate abstract leadership conversations into decision-ready standards.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {frameworkPrinciples.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.05}>
                <article className={index === 1 ? 'site-card-tint h-full p-6' : 'site-card-primary h-full p-6'}>
                  <h2 className="font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">{item.title}</h2>
                  <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[calc(var(--space-section-y)*0.82)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Choose the framework</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.2vw,3.2rem)] text-[var(--site-text-primary)]">
              Use LQ8 for leadership quality,
              <span className="block text-[var(--site-accent-strong)]">or LQ AI Readiness for human capability with AI.</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {frameworks.map((framework, index) => (
              <Reveal key={framework.name} delay={index * 0.05}>
                <TransitionLink href={framework.href} className="group block h-full">
                  <article className={index === 0 ? 'site-card-primary h-full p-7' : 'site-card-tint h-full p-7'}>
                    <h2 className="font-serif text-4xl leading-[1.08] text-[var(--site-text-primary)] transition-colors group-hover:text-[var(--site-accent-strong)]">
                      {framework.name}
                    </h2>
                    <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{framework.summary}</p>
                    <span className="font-eyebrow mt-8 inline-block text-[11px] uppercase tracking-[0.1em] text-[var(--site-link)]">
                      {framework.cta}
                    </span>
                  </article>
                </TransitionLink>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.08}>
            <TransitionLink
              href="/work-with-us"
              className="font-cta mt-8 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
            >
              Talk to us about using a framework
            </TransitionLink>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
