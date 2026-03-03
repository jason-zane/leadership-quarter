import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'

export const metadata: Metadata = {
  title: 'Our Frameworks',
  description:
    'Explore Leadership Quarter frameworks: LQ8 Leadership and LQ AI Readiness.',
}

const frameworks = [
  {
    name: 'LQ8 Leadership',
    href: '/framework/lq8',
    summary:
      'A practical leadership capability model built around four quadrants and eight competencies for hiring, development, and succession decisions.',
    cta: 'Explore LQ8 Leadership',
  },
  {
    name: 'LQ AI Readiness',
    href: '/framework/lq-ai-readiness',
    summary:
      'A grounded framework for assessing whether leaders and teams can adopt AI effectively, audit outputs critically, and improve decision quality at speed.',
    cta: 'Explore LQ AI Readiness',
  },
]

export default function FrameworksPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Our Frameworks</p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              Practical frameworks
              <span className="block text-[var(--site-accent-strong)]">for leadership decisions.</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              Our frameworks are designed to give organisations a clearer operating standard for leadership quality, succession risk, and future capability.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
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
        </div>
      </section>
    </div>
  )
}
