import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'

export const metadata: Metadata = {
  title: 'LQ AI Readiness',
  description:
    'LQ AI Readiness is a practical framework for assessing AI readiness across leadership and teams.',
}

const readinessDimensions = [
  {
    title: 'Judgement under AI support',
    body: 'Can leaders and teams use AI outputs without surrendering critical thinking, context, or accountability?',
  },
  {
    title: 'Adoption behaviour',
    body: 'Do people actively integrate AI into real workflows, or does usage remain shallow, inconsistent, and low-impact?',
  },
  {
    title: 'Output auditing capability',
    body: 'Can teams challenge assumptions, verify quality, and detect hallucinations or weak reasoning before decisions are made?',
  },
  {
    title: 'Operating model integration',
    body: 'Are structures, role expectations, and governance built to support AI-enabled execution at speed?',
  },
]

const applications = [
  'Leadership and executive assessment',
  'Organisation-wide readiness diagnostics',
  'Succession and capability pipeline planning',
  'Team design and role-priority refresh',
]

export default function LqAiReadinessPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Our Frameworks</p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              LQ AI Readiness
              <span className="block text-[var(--site-accent-strong)]">a practical capability framework for AI adoption.</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              LQ AI Readiness assesses the human capabilities required to work effectively with AI in real operating environments, not just tool access or policy compliance.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Assessment lenses</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.8vw,3.7rem)] text-[var(--site-text-primary)]">
              Four readiness dimensions
              <span className="block text-[var(--site-accent-strong)]">for decision quality at speed.</span>
            </h2>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {readinessDimensions.map((dimension, index) => (
              <Reveal key={dimension.title} delay={index * 0.05}>
                <article className={index % 2 === 0 ? 'site-card-primary h-full p-7' : 'site-card-tint h-full p-7'}>
                  <h3 className="font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">{dimension.title}</h3>
                  <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{dimension.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="site-card-strong p-7 md:p-9">
              <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How organisations use this framework</p>
              <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.3vw,3.2rem)] text-[var(--site-text-primary)]">
                Use LQ AI Readiness to prioritise
                <span className="block text-[var(--site-accent-strong)]">capability uplift where it matters most.</span>
              </h2>
              <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                {applications.map((item) => (
                  <li key={item} className="site-card-sub p-4 text-sm leading-relaxed text-[var(--site-text-body)]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <ImmersiveCtaBand
              eyebrow="Next step"
              title="Want to assess AI readiness across your leadership pipeline?"
              description="We can scope an assessment model that aligns AI adoption expectations with your operating reality."
              primaryHref="/work-with-us#inquiry-form"
              primaryLabel="Talk to us"
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
